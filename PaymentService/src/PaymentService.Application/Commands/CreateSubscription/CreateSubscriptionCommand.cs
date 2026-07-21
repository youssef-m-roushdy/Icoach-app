using MediatR;

namespace PaymentService.Application.Commands.CreateSubscription;

public record CreateSubscriptionCommand(int UserId, string PlanType, string Gateway, int? CoachId) : IRequest<CreateSubscriptionResult>;
public record CreateSubscriptionResult(Guid SubscriptionId, string CheckoutUrl);