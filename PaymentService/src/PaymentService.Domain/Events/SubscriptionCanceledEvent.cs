namespace PaymentService.Domain.Events;

public record SubscriptionCanceledEvent(Guid SubscriptionId, int UserId) : BaseDomainEvent;