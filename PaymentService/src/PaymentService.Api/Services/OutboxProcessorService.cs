using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PaymentService.Infrastructure.Persistence;

namespace PaymentService.Api.Services;

public class OutboxProcessorService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<OutboxProcessorService> _logger;

    private const int MaxRetries = 5;
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);

    public OutboxProcessorService(
        IServiceProvider serviceProvider,
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        ILogger<OutboxProcessorService> logger)
    {
        _serviceProvider = serviceProvider;
        _httpClientFactory = httpClientFactory;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingMessagesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Outbox processor loop failed unexpectedly.");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }
    }

    private async Task ProcessPendingMessagesAsync(CancellationToken ct)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PaymentDbContext>();

        var pending = await db.OutboxMessages
            .Where(m => m.ProcessedAt == null && m.RetryCount < MaxRetries)
            .OrderBy(m => m.OccurredAt)
            .Take(20)
            .ToListAsync(ct);

        if (pending.Count == 0) return;

        var webhookBaseUrl = _config["MainServer:WebhookBaseUrl"]
            ?? throw new InvalidOperationException("MainServer:WebhookBaseUrl is not configured.");
        var secret = _config["MainServer:WebhookSecret"]
            ?? throw new InvalidOperationException("MainServer:WebhookSecret is not configured.");

        var client = _httpClientFactory.CreateClient("PaymentWebhookClient");

        foreach (var message in pending)
        {
            var route = message.Type switch
            {
                "SubscriptionActivated" or "SubscriptionRenewed" or "SubscriptionCanceled"
                    => "/api/webhooks/payment/subscription-updated",
                "PaymentSucceeded" or "PaymentFailed" or "PaymentRefunded"
                    => "/api/webhooks/payment/payment-updated",
                _ => null
            };

            if (route is null)
            {
                _logger.LogWarning("Unknown outbox message type {Type}, skipping.", message.Type);
                message.MarkAsProcessed(); // avoid retrying forever on unroutable messages
                continue;
            }

            try
            {
                var signature = ComputeSignature(message.Payload, secret);
                var request = new HttpRequestMessage(HttpMethod.Post, webhookBaseUrl + route)
                {
                    Content = new StringContent(message.Payload, Encoding.UTF8, "application/json")
                };
                request.Headers.Add("X-Payment-Signature", signature);

                var response = await client.SendAsync(request, ct);

                if (response.IsSuccessStatusCode)
                {
                    message.MarkAsProcessed();
                }
                else
                {
                    var body = await response.Content.ReadAsStringAsync(ct);
                    message.MarkAsFailed($"HTTP {(int)response.StatusCode}: {body}");
                    _logger.LogWarning(
                        "Webhook delivery failed for outbox message {Id} ({Type}): {Status}",
                        message.Id, message.Type, response.StatusCode);
                }
            }
            catch (Exception ex)
            {
                message.MarkAsFailed(ex.Message);
                _logger.LogError(ex, "Exception delivering outbox message {Id} ({Type})", message.Id, message.Type);
            }
        }

        await db.SaveChangesAsync(ct);
    }

    private static string ComputeSignature(string payload, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}