using System.Diagnostics;
using System.Text.Json;
using MediatR;
using Microsoft.Extensions.Logging;
using PaymentService.Application.Interfaces;
using PaymentService.Domain.AggregateRoots;
using PaymentService.Domain.Repositories;

namespace PaymentService.Application.Commands.ProcessStripeWebhook;

public record ProcessStripeWebhookCommand(string EventId, string EventType, string Payload) : IRequest<bool>;

public class ProcessStripeWebhookCommandHandler : IRequestHandler<ProcessStripeWebhookCommand, bool>
{
    private readonly IPaymentRepository _paymentRepository;
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IIdempotencyStore _idempotencyStore;
    private readonly ILogger<ProcessStripeWebhookCommandHandler> _logger;

    public ProcessStripeWebhookCommandHandler(
        IPaymentRepository paymentRepository,
        ISubscriptionRepository subscriptionRepository,
        IUnitOfWork unitOfWork,
        IIdempotencyStore idempotencyStore,
        ILogger<ProcessStripeWebhookCommandHandler> logger)
    {
        _paymentRepository = paymentRepository;
        _subscriptionRepository = subscriptionRepository;
        _unitOfWork = unitOfWork;
        _idempotencyStore = idempotencyStore;
        _logger = logger;
    }

    public async Task<bool> Handle(ProcessStripeWebhookCommand request, CancellationToken cancellationToken)
    {
        var sw = Stopwatch.StartNew();
        Guid? paymentId = null;
        Guid? subscriptionId = null;

        try
        {
            var existingRecord = await _idempotencyStore.GetResponseAsync(request.EventId, cancellationToken);
            if (existingRecord is not null)
            {
                _logger.LogInformation(
                    "Stripe webhook ignored (duplicate). EventId={EventId} EventType={EventType} Gateway=Stripe ElapsedMs={ElapsedMs}",
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
                    "Stripe webhook invalid JSON. EventId={EventId} EventType={EventType} Gateway=Stripe ElapsedMs={ElapsedMs}",
                    request.EventId, request.EventType, sw.ElapsedMilliseconds);
                // ACK bad payload so Stripe does not retry forever.
                await StageAndCommitAsync(request, cancellationToken);
                return true;
            }

            using (doc)
            {
                var root = doc.RootElement;

                switch (request.EventType)
                {
                    case "payment_intent.succeeded":
                    case "payment_intent.payment_failed":
                    case "payment_intent.canceled":
                    case "charge.refunded":
                        paymentId = await HandlePaymentIntentEvents(request.EventType, root, cancellationToken);
                        break;

                    case "customer.subscription.created":
                    case "customer.subscription.updated":
                    case "customer.subscription.deleted":
                        subscriptionId = await HandleSubscriptionEvents(request.EventType, root, cancellationToken);
                        break;

                    case "invoice.payment_failed":
                    case "invoice.payment_succeeded":
                        subscriptionId = await HandleInvoiceEvents(request.EventType, root, cancellationToken);
                        break;

                    case "checkout.session.completed":
                    case "checkout.session.expired":
                        (paymentId, subscriptionId) = await HandleCheckoutSession(request.EventType, root, cancellationToken);
                        break;

                    default:
                        _logger.LogInformation(
                            "Stripe webhook ignored (unhandled type). EventId={EventId} EventType={EventType} Gateway=Stripe ElapsedMs={ElapsedMs}",
                            request.EventId, request.EventType, sw.ElapsedMilliseconds);
                        break;
                }

                await StageAndCommitAsync(request, cancellationToken);
            }

            _logger.LogInformation(
                "Stripe webhook processed. EventId={EventId} EventType={EventType} PaymentId={PaymentId} SubscriptionId={SubscriptionId} Gateway=Stripe ElapsedMs={ElapsedMs}",
                request.EventId, request.EventType, paymentId, subscriptionId, sw.ElapsedMilliseconds);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Stripe webhook failed. EventId={EventId} EventType={EventType} PaymentId={PaymentId} SubscriptionId={SubscriptionId} Gateway=Stripe ElapsedMs={ElapsedMs}",
                request.EventId, request.EventType, paymentId, subscriptionId, sw.ElapsedMilliseconds);
            throw;
        }
    }

    private async Task StageAndCommitAsync(ProcessStripeWebhookCommand request, CancellationToken ct)
    {
        await _idempotencyStore.SaveResponseAsync(
            request.EventId,
            nameof(ProcessStripeWebhookCommand),
            "true",
            ct);

        await _unitOfWork.SaveChangesAsync(ct);
    }

    private async Task<Guid?> HandlePaymentIntentEvents(string eventType, JsonElement root, CancellationToken ct)
    {
        if (!TryGetObject(root, out var obj)) return null;

        var paymentIntentId = eventType == "charge.refunded"
            ? GetString(obj, "payment_intent")
            : GetString(obj, "id");

        var payment = await ResolvePaymentAsync(obj, paymentIntentId, ct);
        if (payment is null)
        {
            _logger.LogWarning(
                "Payment not found for Stripe {EventType}. ExternalId={ExternalId}",
                eventType, paymentIntentId);
            return null;
        }

        try
        {
            switch (eventType)
            {
                case "payment_intent.succeeded":
                {
                    var externalId = paymentIntentId ?? payment.ExternalPaymentId;
                    if (string.IsNullOrWhiteSpace(externalId))
                        throw new InvalidOperationException("Missing external payment id for MarkAsPaid.");
                    payment.MarkAsPaid(externalId);
                    break;
                }
                case "payment_intent.payment_failed":
                    payment.MarkAsFailed(ExtractPaymentFailureReason(obj));
                    break;
                case "payment_intent.canceled":
                    payment.MarkAsCancelled();
                    break;
                case "charge.refunded":
                    payment.MarkAsRefunded();
                    break;
            }

            _paymentRepository.Update(payment);
            return payment.Id;
        }
        catch (Exception ex) when (ex is InvalidOperationException or ArgumentException)
        {
            _logger.LogWarning(ex,
                "Ignored invalid payment transition. EventType={EventType} PaymentId={PaymentId} Status={Status}",
                eventType, payment.Id, payment.Status);
            return payment.Id;
        }
    }

    private async Task<Guid?> HandleSubscriptionEvents(string eventType, JsonElement root, CancellationToken ct)
    {
        if (!TryGetObject(root, out var obj)) return null;

        var externalSubId = GetString(obj, "id");
        var subscription = await ResolveSubscriptionAsync(obj, externalSubId, ct);
        if (subscription is null)
        {
            _logger.LogWarning(
                "Subscription not found for Stripe {EventType}. ExternalId={ExternalId}",
                eventType, externalSubId);
            return null;
        }

        try
        {
            if (eventType == "customer.subscription.deleted")
            {
                var status = GetString(obj, "status");
                if (status is "canceled" or "unpaid" or "incomplete_expired")
                    subscription.Cancel();
                else
                    subscription.Expire();
            }
            else
            {
                ApplySubscriptionStatus(subscription, obj, externalSubId);
            }

            _subscriptionRepository.Update(subscription);
            return subscription.Id;
        }
        catch (Exception ex) when (ex is InvalidOperationException or ArgumentException)
        {
            _logger.LogWarning(ex,
                "Ignored invalid subscription transition. EventType={EventType} SubscriptionId={SubscriptionId} Status={Status}",
                eventType, subscription.Id, subscription.Status);
            return subscription.Id;
        }
    }

    private async Task<Guid?> HandleInvoiceEvents(string eventType, JsonElement root, CancellationToken ct)
    {
        if (!TryGetObject(root, out var obj)) return null;

        var externalSubId = GetString(obj, "subscription");
        if (externalSubId is null) return null;

        var subscription = await _subscriptionRepository.GetByExternalSubscriptionIdAsync(externalSubId, ct);
        if (subscription is null)
        {
            // Fallback: metadata on invoice parent subscription is not always present.
            var metadata = GetMetadata(obj);
            subscription = await ResolveSubscriptionFromMetadataAsync(metadata, ct);
        }

        if (subscription is null)
        {
            _logger.LogWarning(
                "Subscription not found for Stripe {EventType}. ExternalSubscriptionId={ExternalSubscriptionId}",
                eventType, externalSubId);
            return null;
        }

        try
        {
            if (eventType == "invoice.payment_failed")
            {
                subscription.MarkAsPastDue();
            }
            else if (eventType == "invoice.payment_succeeded")
            {
                var periodStart = GetUnixDateTime(obj, "period_start") ?? subscription.CurrentPeriodStart;
                var periodEnd = GetUnixDateTime(obj, "period_end") ?? subscription.CurrentPeriodEnd;

                if (subscription.Status == Domain.Enums.SubscriptionStatus.Trialing
                    || string.IsNullOrWhiteSpace(subscription.ExternalSubscriptionId))
                {
                    subscription.Activate(externalSubId, periodStart, periodEnd);
                }
                else
                {
                    subscription.Renew(periodStart, periodEnd);
                }
            }

            _subscriptionRepository.Update(subscription);
            return subscription.Id;
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex,
                "Ignored invalid subscription transition on invoice event. EventType={EventType} SubscriptionId={SubscriptionId}",
                eventType, subscription.Id);
            return subscription.Id;
        }
    }

    private async Task<(Guid? PaymentId, Guid? SubscriptionId)> HandleCheckoutSession(
        string eventType,
        JsonElement root,
        CancellationToken ct)
    {
        if (!TryGetObject(root, out var obj)) return (null, null);

        var sessionId = GetString(obj, "id");
        var mode = GetString(obj, "mode");

        if (eventType == "checkout.session.expired")
        {
            var payment = await ResolvePaymentAsync(obj, paymentIntentId: null, ct, sessionId);
            if (payment is null) return (null, null);

            try
            {
                payment.MarkAsCancelled();
                _paymentRepository.Update(payment);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Ignored cancel on expired session. PaymentId={PaymentId}", payment.Id);
            }

            return (payment.Id, null);
        }

        // checkout.session.completed
        if (mode == "subscription")
        {
            var externalSubId = GetString(obj, "subscription");
            var subscription = await ResolveSubscriptionAsync(obj, externalSubId, ct, sessionId);
            if (subscription is null) return (null, null);

            var periodStart = DateTime.UtcNow;
            var periodEnd = periodStart.AddMonths(1);

            try
            {
                if (!string.IsNullOrWhiteSpace(externalSubId))
                    subscription.Activate(externalSubId, periodStart, periodEnd);
                _subscriptionRepository.Update(subscription);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Ignored activate on checkout.completed. SubscriptionId={SubscriptionId}", subscription.Id);
            }

            return (null, subscription.Id);
        }

        // mode == payment (or default)
        {
            var paymentIntentId = GetString(obj, "payment_intent");
            var payment = await ResolvePaymentAsync(obj, paymentIntentId, ct, sessionId);
            if (payment is null) return (null, null);

            var paymentStatus = GetString(obj, "payment_status");
            try
            {
                if (paymentStatus == "paid" || GetString(obj, "status") == "complete")
                {
                    payment.MarkAsPaid(paymentIntentId ?? payment.ExternalPaymentId ?? sessionId ?? string.Empty);
                }

                _paymentRepository.Update(payment);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Ignored paid on checkout.completed. PaymentId={PaymentId}", payment.Id);
            }

            return (payment.Id, null);
        }
    }

    private void ApplySubscriptionStatus(Subscription subscription, JsonElement obj, string? externalSubId)
    {
        var status = GetString(obj, "status") ?? string.Empty;
        var periodStart = GetUnixDateTime(obj, "current_period_start") ?? DateTime.UtcNow;
        var periodEnd = GetUnixDateTime(obj, "current_period_end") ?? periodStart.AddMonths(1);
        var cancelAtPeriodEnd = obj.TryGetProperty("cancel_at_period_end", out var cap)
                                && cap.ValueKind == JsonValueKind.True;

        if (cancelAtPeriodEnd)
            subscription.DisableAutoRenew();

        switch (status)
        {
            case "active":
            case "trialing":
            {
                var resolvedExternalId = externalSubId ?? subscription.ExternalSubscriptionId;
                if (string.IsNullOrWhiteSpace(resolvedExternalId))
                    throw new InvalidOperationException("Missing external subscription id for activation.");

                if (subscription.Status == Domain.Enums.SubscriptionStatus.Trialing
                    || string.IsNullOrWhiteSpace(subscription.ExternalSubscriptionId))
                {
                    subscription.Activate(resolvedExternalId, periodStart, periodEnd);
                }
                else
                {
                    subscription.Renew(periodStart, periodEnd);
                }
                break;
            }

            case "past_due":
            case "unpaid":
                subscription.MarkAsPastDue();
                break;

            case "canceled":
                subscription.Cancel();
                break;

            case "incomplete_expired":
                subscription.Expire();
                break;
        }
    }

    private async Task<Payment?> ResolvePaymentAsync(
        JsonElement obj,
        string? paymentIntentId,
        CancellationToken ct,
        string? sessionId = null)
    {
        var metadata = GetMetadata(obj);

        if (TryGetGuid(metadata, "paymentId", out var paymentId))
        {
            var byId = await _paymentRepository.GetByIdAsync(paymentId, ct);
            if (byId is not null) return byId;
        }

        if (!string.IsNullOrWhiteSpace(paymentIntentId))
        {
            var byExternal = await _paymentRepository.GetByExternalPaymentIdAsync(paymentIntentId, ct);
            if (byExternal is not null) return byExternal;
        }

        if (!string.IsNullOrWhiteSpace(sessionId))
        {
            var bySession = await _paymentRepository.GetByExternalSessionIdAsync(sessionId, ct);
            if (bySession is not null) return bySession;
        }

        return null;
    }

    private async Task<Subscription?> ResolveSubscriptionAsync(
        JsonElement obj,
        string? externalSubId,
        CancellationToken ct,
        string? sessionId = null)
    {
        var metadata = GetMetadata(obj);
        var fromMetadata = await ResolveSubscriptionFromMetadataAsync(metadata, ct);
        if (fromMetadata is not null) return fromMetadata;

        if (!string.IsNullOrWhiteSpace(externalSubId))
        {
            var byExternal = await _subscriptionRepository.GetByExternalSubscriptionIdAsync(externalSubId, ct);
            if (byExternal is not null) return byExternal;
        }

        if (!string.IsNullOrWhiteSpace(sessionId))
        {
            var bySession = await _subscriptionRepository.GetByExternalSessionIdAsync(sessionId, ct);
            if (bySession is not null) return bySession;
        }

        return null;
    }

    private async Task<Subscription?> ResolveSubscriptionFromMetadataAsync(JsonElement metadata, CancellationToken ct)
    {
        if (TryGetGuid(metadata, "subscriptionId", out var subscriptionId))
            return await _subscriptionRepository.GetByIdAsync(subscriptionId, ct);

        return null;
    }

    private static bool TryGetObject(JsonElement root, out JsonElement obj)
    {
        obj = default;
        return root.TryGetProperty("data", out var data)
               && data.TryGetProperty("object", out obj)
               && obj.ValueKind == JsonValueKind.Object;
    }

    private static JsonElement GetMetadata(JsonElement obj)
        => obj.TryGetProperty("metadata", out var meta) && meta.ValueKind == JsonValueKind.Object
            ? meta
            : default;

    private static string? GetString(JsonElement obj, string propertyName)
    {
        if (!obj.TryGetProperty(propertyName, out var prop)) return null;
        return prop.ValueKind switch
        {
            JsonValueKind.String => prop.GetString(),
            JsonValueKind.Number => prop.GetRawText(),
            JsonValueKind.Null => null,
            _ => prop.ToString()
        };
    }

    private static bool TryGetGuid(JsonElement metadata, string propertyName, out Guid value)
    {
        value = Guid.Empty;
        if (metadata.ValueKind != JsonValueKind.Object) return false;
        var raw = GetString(metadata, propertyName);
        return Guid.TryParse(raw, out value);
    }

    private static DateTime? GetUnixDateTime(JsonElement obj, string propertyName)
    {
        if (!obj.TryGetProperty(propertyName, out var prop)) return null;
        if (prop.ValueKind != JsonValueKind.Number) return null;
        return DateTimeOffset.FromUnixTimeSeconds(prop.GetInt64()).UtcDateTime;
    }

    private static string ExtractPaymentFailureReason(JsonElement obj)
    {
        if (obj.TryGetProperty("last_payment_error", out var err) && err.ValueKind == JsonValueKind.Object)
        {
            var message = GetString(err, "message");
            if (!string.IsNullOrWhiteSpace(message)) return message!;
        }

        return "Payment failed";
    }
}
