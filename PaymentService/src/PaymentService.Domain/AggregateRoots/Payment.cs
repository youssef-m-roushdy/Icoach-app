using PaymentService.Domain.Enums;
using PaymentService.Domain.Events;

namespace PaymentService.Domain.AggregateRoots;

public class Payment
{
    public Guid Id { get; private set; }
    public int UserId { get; private set; }
    public string OrderId { get; private set; } = string.Empty;
    public decimal Amount { get; private set; }
    public string Currency { get; private set; } = string.Empty;
    public GatewayType Gateway { get; private set; }
    public PaymentStatus Status { get; private set; }
    public string? ExternalPaymentId { get; private set; }
    public string? ExternalSessionId { get; private set; }
    public string? CheckoutUrl { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public string? FailureReason { get; private set; }

    private readonly List<BaseDomainEvent> _domainEvents = new();
    public IReadOnlyCollection<BaseDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    private Payment() { }

    public Payment(int userId, string orderId, decimal amount, string currency, GatewayType gateway)
    {
        if (userId <= 0) throw new ArgumentOutOfRangeException(nameof(userId));
        if (string.IsNullOrWhiteSpace(orderId)) throw new ArgumentException("OrderId is required.", nameof(orderId));
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        if (string.IsNullOrWhiteSpace(currency) || currency.Length != 3)
            throw new ArgumentException("Currency must be a 3-letter ISO code.", nameof(currency));

        Id = Guid.NewGuid();
        UserId = userId;
        OrderId = orderId;
        Amount = amount;
        Currency = currency.ToUpperInvariant();
        Gateway = gateway;
        Status = PaymentStatus.Pending;
        CreatedAt = DateTime.UtcNow;
    }

    public void SetCheckoutUrl(string url, string externalSessionId)
    {
        if (string.IsNullOrWhiteSpace(url)) throw new ArgumentException("Checkout URL is required.", nameof(url));
        if (string.IsNullOrWhiteSpace(externalSessionId))
            throw new ArgumentException("External session id is required.", nameof(externalSessionId));

        if (Status is not (PaymentStatus.Pending or PaymentStatus.Processing))
            throw new InvalidOperationException($"Cannot set checkout URL from {Status}");

        CheckoutUrl = url;
        ExternalSessionId = externalSessionId;
        Status = PaymentStatus.Processing;
        Touch();
    }

    public void AttachExternalPaymentId(string externalPaymentId)
    {
        if (string.IsNullOrWhiteSpace(externalPaymentId))
            throw new ArgumentException("External payment id is required.", nameof(externalPaymentId));

        if (ExternalPaymentId is not null &&
            !string.Equals(ExternalPaymentId, externalPaymentId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"Payment already linked to external id '{ExternalPaymentId}'.");
        }

        ExternalPaymentId = externalPaymentId;
        Touch();
    }

    public void MarkAsPaid(string externalPaymentId)
    {
        if (Status == PaymentStatus.Paid)
        {
            if (!string.IsNullOrWhiteSpace(externalPaymentId))
                AttachExternalPaymentId(externalPaymentId);
            return;
        }

        if (Status is not (PaymentStatus.Pending or PaymentStatus.Processing))
            throw new InvalidOperationException($"Cannot transition to Paid from {Status}");

        if (string.IsNullOrWhiteSpace(externalPaymentId))
            throw new ArgumentException("External payment id is required when marking paid.", nameof(externalPaymentId));

        ExternalPaymentId = externalPaymentId;
        Status = PaymentStatus.Paid;
        CompletedAt = DateTime.UtcNow;
        FailureReason = null;
        Touch();

        Raise(new PaymentSucceededEvent(Id, UserId, OrderId, Amount));
    }

    public void MarkAsFailed(string reason)
    {
        if (Status == PaymentStatus.Failed) return;

        if (Status is not (PaymentStatus.Pending or PaymentStatus.Processing))
            throw new InvalidOperationException($"Cannot transition to Failed from {Status}");

        Status = PaymentStatus.Failed;
        FailureReason = string.IsNullOrWhiteSpace(reason) ? "Payment failed" : reason;
        Touch();

        Raise(new PaymentFailedEvent(Id, UserId, OrderId, FailureReason));
    }

    public void MarkAsRefunded()
    {
        if (Status == PaymentStatus.Refunded) return;

        if (Status != PaymentStatus.Paid)
            throw new InvalidOperationException($"Cannot transition to Refunded from {Status}");

        Status = PaymentStatus.Refunded;
        Touch();

        Raise(new PaymentRefundedEvent(Id, UserId, OrderId));
    }

    public void MarkAsCancelled()
    {
        if (Status == PaymentStatus.Cancelled) return;

        if (Status is not (PaymentStatus.Pending or PaymentStatus.Processing))
            throw new InvalidOperationException($"Cannot transition to Cancelled from {Status}");

        Status = PaymentStatus.Cancelled;
        Touch();

        Raise(new PaymentCancelledEvent(Id, UserId, OrderId));
    }

    public void ClearDomainEvents() => _domainEvents.Clear();

    private void Raise(BaseDomainEvent domainEvent)
    {
        if (_domainEvents.Exists(e => e.GetType() == domainEvent.GetType()))
            return;

        _domainEvents.Add(domainEvent);
    }

    private void Touch() => UpdatedAt = DateTime.UtcNow;
}
