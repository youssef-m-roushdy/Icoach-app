namespace PaymentService.Domain.Events;

public record PaymentRefundedEvent(Guid PaymentId, string UserId, string OrderId) : BaseDomainEvent;