namespace PaymentService.Domain.Events;

public record PaymentCancelledEvent(Guid PaymentId, int UserId, string OrderId) : BaseDomainEvent;
