namespace PaymentService.Domain.Events;

public record PaymentRefundedEvent(Guid PaymentId, int UserId, string OrderId) : BaseDomainEvent;