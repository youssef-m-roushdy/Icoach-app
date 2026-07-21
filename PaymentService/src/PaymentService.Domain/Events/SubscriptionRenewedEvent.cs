namespace PaymentService.Domain.Events;

public record SubscriptionRenewedEvent(Guid SubscriptionId, string UserId, DateTime NewExpiryDate) : BaseDomainEvent;