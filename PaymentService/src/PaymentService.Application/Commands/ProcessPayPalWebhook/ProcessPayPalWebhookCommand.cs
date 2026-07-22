using System.Diagnostics;
using System.Text.Json;
using MediatR;
using Microsoft.Extensions.Logging;
using PaymentService.Application.Interfaces;
using PaymentService.Domain.Repositories;

namespace PaymentService.Application.Commands.ProcessPayPalWebhook;

public record ProcessPayPalWebhookCommand(string EventId, string EventType, string Payload) : IRequest<bool>;

public class ProcessPayPalWebhookCommandHandler : IRequestHandler<ProcessPayPalWebhookCommand, bool>
{
    private readonly IPaymentRepository _paymentRepository;
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IIdempotencyStore _idempotencyStore;
    private readonly ILogger<ProcessPayPalWebhookCommandHandler> _logger;

    public ProcessPayPalWebhookCommandHandler(
        IPaymentRepository paymentRepository,
        ISubscriptionRepository subscriptionRepository,
        IUnitOfWork unitOfWork,
        IIdempotencyStore idempotencyStore,
        ILogger<ProcessPayPalWebhookCommandHandler> logger)
    {
        _paymentRepository = paymentRepository;
        _subscriptionRepository = subscriptionRepository;
        _unitOfWork = unitOfWork;
        _idempotencyStore = idempotencyStore;
        _logger = logger;
    }

    public async Task<bool> Handle(ProcessPayPalWebhookCommand request, CancellationToken cancellationToken)
    {
        var sw = Stopwatch.StartNew();
        Guid? paymentId = null;
        Guid? subscriptionId = null;

        try
        {
            var existing = await _idempotencyStore.GetResponseAsync(request.EventId, cancellationToken);
            if (existing is not null)
            {
                _logger.LogInformation(
                    "PayPal webhook ignored (duplicate). EventId={EventId} EventType={EventType} Gateway=PayPal ElapsedMs={ElapsedMs}",
                    request.EventId, request.EventType, sw.ElapsedMilliseconds);
                return true;
            }

            JsonDocument doc;
            try
            {
                doc = JsonDocument.Parse(request.Payload);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex,
                    "PayPal webhook invalid JSON. EventId={EventId} Gateway=PayPal ElapsedMs={ElapsedMs}",
                    request.EventId, sw.ElapsedMilliseconds);
                await CommitAsync(request, cancellationToken);
                return true;
            }

            using (doc)
            {
                var root = doc.RootElement;
                var resource = root.TryGetProperty("resource", out var res) && res.ValueKind == JsonValueKind.Object
                    ? res
                    : default;

                switch (request.EventType)
                {
                    case "PAYMENT.CAPTURE.COMPLETED":
                    case "CHECKOUT.ORDER.APPROVED":
                        paymentId = await HandlePaymentSuccessAsync(resource, cancellationToken);
                        break;
                    case "PAYMENT.CAPTURE.DENIED":
                    case "PAYMENT.CAPTURE.DECLINED":
                        paymentId = await HandlePaymentFailedAsync(resource, cancellationToken);
                        break;
                    case "PAYMENT.CAPTURE.REFUNDED":
                        paymentId = await HandlePaymentRefundedAsync(resource, cancellationToken);
                        break;
                    case "BILLING.SUBSCRIPTION.ACTIVATED":
                        subscriptionId = await HandleSubscriptionActivatedAsync(resource, cancellationToken);
                        break;
                    case "BILLING.SUBSCRIPTION.CANCELLED":
                        subscriptionId = await HandleSubscriptionCancelledAsync(resource, cancellationToken);
                        break;
                    case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
                        subscriptionId = await HandleSubscriptionPastDueAsync(resource, cancellationToken);
                        break;
                    default:
                        _logger.LogInformation(
                            "PayPal webhook ignored (unhandled type). EventId={EventId} EventType={EventType} Gateway=PayPal ElapsedMs={ElapsedMs}",
                            request.EventId, request.EventType, sw.ElapsedMilliseconds);
                        break;
                }

                await CommitAsync(request, cancellationToken);
            }

            _logger.LogInformation(
                "PayPal webhook processed. EventId={EventId} EventType={EventType} PaymentId={PaymentId} SubscriptionId={SubscriptionId} Gateway=PayPal ElapsedMs={ElapsedMs}",
                request.EventId, request.EventType, paymentId, subscriptionId, sw.ElapsedMilliseconds);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "PayPal webhook failed. EventId={EventId} EventType={EventType} PaymentId={PaymentId} SubscriptionId={SubscriptionId} Gateway=PayPal ElapsedMs={ElapsedMs}",
                request.EventId, request.EventType, paymentId, subscriptionId, sw.ElapsedMilliseconds);
            throw;
        }
    }

    private async Task<Guid?> HandlePaymentSuccessAsync(JsonElement resource, CancellationToken ct)
    {
        var payment = await ResolvePaymentAsync(resource, ct);
        if (payment is null) return null;

        try
        {
            var externalId = GetCustomOrId(resource);
            payment.MarkAsPaid(externalId);
            _paymentRepository.Update(payment);
            return payment.Id;
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ignored PayPal paid transition. PaymentId={PaymentId}", payment.Id);
            return payment.Id;
        }
    }

    private async Task<Guid?> HandlePaymentFailedAsync(JsonElement resource, CancellationToken ct)
    {
        var payment = await ResolvePaymentAsync(resource, ct);
        if (payment is null) return null;

        try
        {
            payment.MarkAsFailed("PayPal capture denied/declined.");
            _paymentRepository.Update(payment);
            return payment.Id;
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ignored PayPal failed transition. PaymentId={PaymentId}", payment.Id);
            return payment.Id;
        }
    }

    private async Task<Guid?> HandlePaymentRefundedAsync(JsonElement resource, CancellationToken ct)
    {
        var payment = await ResolvePaymentAsync(resource, ct);
        if (payment is null) return null;

        try
        {
            payment.MarkAsRefunded();
            _paymentRepository.Update(payment);
            return payment.Id;
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ignored PayPal refund transition. PaymentId={PaymentId}", payment.Id);
            return payment.Id;
        }
    }

    private async Task<Guid?> HandleSubscriptionActivatedAsync(JsonElement resource, CancellationToken ct)
    {
        var subscription = await ResolveSubscriptionAsync(resource, ct);
        if (subscription is null) return null;

        try
        {
            var externalId = GetString(resource, "id") ?? subscription.ExternalSubscriptionId ?? string.Empty;
            var start = DateTime.UtcNow;
            subscription.Activate(externalId, start, start.AddMonths(1));
            _subscriptionRepository.Update(subscription);
            return subscription.Id;
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ignored PayPal activate transition. SubscriptionId={SubscriptionId}", subscription.Id);
            return subscription.Id;
        }
    }

    private async Task<Guid?> HandleSubscriptionCancelledAsync(JsonElement resource, CancellationToken ct)
    {
        var subscription = await ResolveSubscriptionAsync(resource, ct);
        if (subscription is null) return null;

        try
        {
            subscription.Cancel();
            _subscriptionRepository.Update(subscription);
            return subscription.Id;
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ignored PayPal cancel transition. SubscriptionId={SubscriptionId}", subscription.Id);
            return subscription.Id;
        }
    }

    private async Task<Guid?> HandleSubscriptionPastDueAsync(JsonElement resource, CancellationToken ct)
    {
        var subscription = await ResolveSubscriptionAsync(resource, ct);
        if (subscription is null) return null;

        try
        {
            subscription.MarkAsPastDue();
            _subscriptionRepository.Update(subscription);
            return subscription.Id;
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ignored PayPal past-due transition. SubscriptionId={SubscriptionId}", subscription.Id);
            return subscription.Id;
        }
    }

    private async Task<Domain.AggregateRoots.Payment?> ResolvePaymentAsync(JsonElement resource, CancellationToken ct)
    {
        if (resource.ValueKind != JsonValueKind.Object) return null;

        if (TryGetGuidFromCustomId(resource, out var paymentId))
        {
            var byId = await _paymentRepository.GetByIdAsync(paymentId, ct);
            if (byId is not null) return byId;
        }

        var externalId = GetString(resource, "id");
        if (!string.IsNullOrWhiteSpace(externalId))
            return await _paymentRepository.GetByExternalPaymentIdAsync(externalId, ct);

        return null;
    }

    private async Task<Domain.AggregateRoots.Subscription?> ResolveSubscriptionAsync(JsonElement resource, CancellationToken ct)
    {
        if (resource.ValueKind != JsonValueKind.Object) return null;

        if (TryGetGuidFromCustomId(resource, out var subscriptionId))
        {
            var byId = await _subscriptionRepository.GetByIdAsync(subscriptionId, ct);
            if (byId is not null) return byId;
        }

        var externalId = GetString(resource, "id");
        if (!string.IsNullOrWhiteSpace(externalId))
            return await _subscriptionRepository.GetByExternalSubscriptionIdAsync(externalId, ct);

        return null;
    }

    private async Task CommitAsync(ProcessPayPalWebhookCommand request, CancellationToken ct)
    {
        await _idempotencyStore.SaveResponseAsync(
            request.EventId, nameof(ProcessPayPalWebhookCommand), "true", ct);
        await _unitOfWork.SaveChangesAsync(ct);
    }

    private static bool TryGetGuidFromCustomId(JsonElement resource, out Guid id)
    {
        id = Guid.Empty;
        var customId = GetString(resource, "custom_id");
        return Guid.TryParse(customId, out id);
    }

    private static string GetCustomOrId(JsonElement resource)
        => GetString(resource, "id") ?? Guid.NewGuid().ToString();

    private static string? GetString(JsonElement obj, string name)
    {
        if (!obj.TryGetProperty(name, out var prop)) return null;
        return prop.ValueKind == JsonValueKind.String ? prop.GetString() : prop.ToString();
    }
}
