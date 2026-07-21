using PaymentService.Domain.Enums;
using PaymentService.Domain.Events;

namespace PaymentService.Domain.AggregateRoots;

public class Payment
{
    public Guid Id { get; private set; }
    public int UserId { get; private set; }
    public string OrderId { get; private set; }
    public decimal Amount { get; private set; }
    public string Currency { get; private set; }
    public GatewayType Gateway { get; private set; }
    public PaymentStatus Status { get; private set; }
    public string? ExternalPaymentId { get; private set; }
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
        Id = Guid.NewGuid();
        UserId = userId;
        OrderId = orderId;
        Amount = amount;
        Currency = currency;
        Gateway = gateway;
        Status = PaymentStatus.Pending;
        CreatedAt = DateTime.UtcNow;
    }

    public void SetCheckoutUrl(string url)
    {
        CheckoutUrl = url;
        Status = PaymentStatus.Processing;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAsPaid(string externalPaymentId)
    {
        if (Status == PaymentStatus.Paid) return;

        ExternalPaymentId = externalPaymentId;
        Status = PaymentStatus.Paid;
        CompletedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
        
        _domainEvents.Add(new PaymentSucceededEvent(Id, UserId, OrderId, Amount));
    }

    public void MarkAsFailed(string reason)
    {
        Status = PaymentStatus.Failed;
        FailureReason = reason;
        UpdatedAt = DateTime.UtcNow;
        
        _domainEvents.Add(new PaymentFailedEvent(Id, UserId, OrderId, reason));
    }

    public void MarkAsRefunded()
    {
        Status = PaymentStatus.Refunded;
        UpdatedAt = DateTime.UtcNow;
        _domainEvents.Add(new PaymentRefundedEvent(Id, UserId, OrderId));
    }

    public void ClearDomainEvents() => _domainEvents.Clear();
}