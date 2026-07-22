using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PaymentService.Application.Options;
using PaymentService.Infrastructure.Persistence;

namespace PaymentService.Api.Services;

public class OutboxProcessorService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly MainServerOptions _mainServerOptions;
    private readonly OutboxOptions _outboxOptions;
    private readonly ILogger<OutboxProcessorService> _logger;

    public OutboxProcessorService(
        IServiceProvider serviceProvider,
        IHttpClientFactory httpClientFactory,
        IOptions<MainServerOptions> mainServerOptions,
        IOptions<OutboxOptions> outboxOptions,
        ILogger<OutboxProcessorService> logger)
    {
        _serviceProvider = serviceProvider;
        _httpClientFactory = httpClientFactory;
        _mainServerOptions = mainServerOptions.Value;
        _outboxOptions = outboxOptions.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var pollInterval = TimeSpan.FromSeconds(Math.Max(1, _outboxOptions.PollIntervalSeconds));

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingMessagesAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Outbox processor loop failed unexpectedly.");
            }

            try
            {
                await Task.Delay(pollInterval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }

    private async Task ProcessPendingMessagesAsync(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_mainServerOptions.WebhookBaseUrl)
            || string.IsNullOrWhiteSpace(_mainServerOptions.WebhookSecret))
        {
            _logger.LogError("MainServer webhook configuration is incomplete. Skipping outbox processing.");
            return;
        }

        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PaymentDbContext>();

        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var now = DateTime.UtcNow;
        var maxRetries = Math.Max(1, _outboxOptions.MaxRetries);
        var batchSize = Math.Max(1, _outboxOptions.BatchSize);

        // SKIP LOCKED prevents multiple processor instances from claiming the same rows.
        var pending = await db.OutboxMessages
            .FromSqlInterpolated($@"
                SELECT *
                FROM ""OutboxMessages""
                WHERE ""ProcessedAt"" IS NULL
                  AND ""IsDeadLettered"" = FALSE
                  AND ""RetryCount"" < {maxRetries}
                  AND ""AvailableAt"" <= {now}
                ORDER BY ""OccurredAt""
                LIMIT {batchSize}
                FOR UPDATE SKIP LOCKED")
            .ToListAsync(ct);

        if (pending.Count == 0)
        {
            await transaction.CommitAsync(ct);
            return;
        }

        var client = _httpClientFactory.CreateClient("PaymentWebhookClient");

        foreach (var message in pending)
        {
            ct.ThrowIfCancellationRequested();

            var route = ResolveRoute(message.Type);
            if (route is null)
            {
                _logger.LogWarning(
                    "Unknown outbox message type {Type} for message {Id}. Dead-lettering.",
                    message.Type, message.Id);
                message.MarkAsDeadLettered($"Unknown outbox type '{message.Type}'.");
                continue;
            }

            var sw = Stopwatch.StartNew();
            try
            {
                var signature = ComputeSignature(message.Payload, _mainServerOptions.WebhookSecret);
                using var request = new HttpRequestMessage(HttpMethod.Post, _mainServerOptions.WebhookBaseUrl.TrimEnd('/') + route)
                {
                    Content = new StringContent(message.Payload, Encoding.UTF8, "application/json")
                };
                request.Headers.TryAddWithoutValidation("X-Payment-Signature", signature);
                request.Headers.TryAddWithoutValidation("X-Outbox-Message-Id", message.Id.ToString());
                request.Headers.TryAddWithoutValidation("X-Outbox-Event-Type", message.Type);

                var response = await client.SendAsync(request, ct);

                if (response.IsSuccessStatusCode)
                {
                    message.MarkAsProcessed();
                    _logger.LogInformation(
                        "Outbox delivered. MessageId={MessageId} Type={Type} ElapsedMs={ElapsedMs}",
                        message.Id, message.Type, sw.ElapsedMilliseconds);
                }
                else
                {
                    var body = await response.Content.ReadAsStringAsync(ct);
                    message.MarkAsFailed($"HTTP {(int)response.StatusCode}: {body}", maxRetries);
                    _logger.LogWarning(
                        "Outbox delivery failed. MessageId={MessageId} Type={Type} Status={Status} RetryCount={RetryCount} DeadLettered={DeadLettered} ElapsedMs={ElapsedMs}",
                        message.Id, message.Type, response.StatusCode, message.RetryCount, message.IsDeadLettered, sw.ElapsedMilliseconds);
                }
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                message.MarkAsFailed(ex.Message, maxRetries);
                _logger.LogError(ex,
                    "Outbox delivery exception. MessageId={MessageId} Type={Type} RetryCount={RetryCount} DeadLettered={DeadLettered} ElapsedMs={ElapsedMs}",
                    message.Id, message.Type, message.RetryCount, message.IsDeadLettered, sw.ElapsedMilliseconds);
            }
        }

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    private static string? ResolveRoute(string type) => type switch
    {
        "SubscriptionActivated" or "SubscriptionRenewed" or "SubscriptionCanceled"
            or "SubscriptionPastDue" or "SubscriptionExpired"
            => "/api/webhooks/payment/subscription-updated",
        "PaymentSucceeded" or "PaymentFailed" or "PaymentRefunded" or "PaymentCancelled"
            => "/api/webhooks/payment/payment-updated",
        _ => null
    };

    private static string ComputeSignature(string payload, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
