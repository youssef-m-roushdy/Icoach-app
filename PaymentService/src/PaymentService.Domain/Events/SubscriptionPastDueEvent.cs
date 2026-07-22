namespace PaymentService.Domain.Events;

public record SubscriptionPastDueEvent(Guid SubscriptionId, int UserId) : BaseDomainEvent;
