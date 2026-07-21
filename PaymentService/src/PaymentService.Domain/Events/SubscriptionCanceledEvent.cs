namespace PaymentService.Domain.Events;

public record SubscriptionCanceledEvent(Guid SubscriptionId, string UserId) : BaseDomainEvent;