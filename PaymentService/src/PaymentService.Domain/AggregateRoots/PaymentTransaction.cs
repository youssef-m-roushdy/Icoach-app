using PaymentService.Domain.Enums;

namespace PaymentService.Domain.AggregateRoots;

public class PaymentTransaction
{
    public Guid Id { get; private set; }
    public Guid PaymentId { get; private set; }
    public string GatewayTransactionId { get; private set; }
    public PaymentStatus Status { get; private set; }
    public string RawResponse { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private PaymentTransaction() { }

    public PaymentTransaction(Guid paymentId, string gatewayTransactionId, PaymentStatus status, string rawResponse)
    {
        Id = Guid.NewGuid();
        PaymentId = paymentId;
        GatewayTransactionId = gatewayTransactionId;
        Status = status;
        RawResponse = rawResponse;
        CreatedAt = DateTime.UtcNow;
    }
}