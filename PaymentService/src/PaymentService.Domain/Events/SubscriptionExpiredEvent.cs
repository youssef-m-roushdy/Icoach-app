namespace PaymentService.Domain.Events;

public record SubscriptionExpiredEvent(Guid SubscriptionId, int UserId) : BaseDomainEvent;
