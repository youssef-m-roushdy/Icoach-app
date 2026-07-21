namespace PaymentService.Domain.Events;

public record PaymentFailedEvent(Guid PaymentId, int UserId, string OrderId, string Reason) : BaseDomainEvent;