namespace PaymentService.Domain.Events;

public record PaymentFailedEvent(Guid PaymentId, string UserId, string OrderId, string Reason) : BaseDomainEvent;