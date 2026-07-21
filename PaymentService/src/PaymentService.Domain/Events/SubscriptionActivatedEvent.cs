using PaymentService.Domain.Enums;

namespace PaymentService.Domain.Events;
public record SubscriptionActivatedEvent(Guid SubscriptionId, int UserId, int? CoachId, SubscriptionPlanType PlanType, DateTime ExpiresAt) : BaseDomainEvent;