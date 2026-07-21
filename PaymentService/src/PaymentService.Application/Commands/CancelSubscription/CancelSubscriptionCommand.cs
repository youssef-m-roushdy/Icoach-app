using MediatR;

namespace PaymentService.Application.Commands.CancelSubscription;

public record CancelSubscriptionCommand(Guid SubscriptionId) : IRequest<CancelSubscriptionResult>;
public record CancelSubscriptionResult(bool Success, string Status);