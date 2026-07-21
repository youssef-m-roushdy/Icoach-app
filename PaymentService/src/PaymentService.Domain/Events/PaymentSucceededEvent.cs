namespace PaymentService.Domain.Events;

public record PaymentSucceededEvent(Guid PaymentId, string UserId, string OrderId, decimal Amount) : BaseDomainEvent;