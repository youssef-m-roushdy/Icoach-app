using PaymentService.Domain.Enums;

namespace PaymentService.Domain.Events;

public record SubscriptionActivatedEvent(Guid SubscriptionId, string UserId, Guid? CoachId, SubscriptionPlanType PlanType, DateTime ExpiresAt) : BaseDomainEvent;