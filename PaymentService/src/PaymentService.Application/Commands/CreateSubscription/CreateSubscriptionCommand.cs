using MediatR;

namespace PaymentService.Application.Commands.CreateSubscription;

public record CreateSubscriptionCommand(string UserId, string PlanType, string Gateway, string? CoachId) : IRequest<CreateSubscriptionResult>;
public record CreateSubscriptionResult(Guid SubscriptionId, string CheckoutUrl);