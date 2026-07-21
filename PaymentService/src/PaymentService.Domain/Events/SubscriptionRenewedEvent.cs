namespace PaymentService.Domain.Events;

public record SubscriptionRenewedEvent(Guid SubscriptionId, int UserId, DateTime NewExpiryDate) : BaseDomainEvent;