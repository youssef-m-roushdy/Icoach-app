namespace PaymentService.Domain.Events;

public record PaymentSucceededEvent(Guid PaymentId, int UserId, string OrderId, decimal Amount) : BaseDomainEvent;