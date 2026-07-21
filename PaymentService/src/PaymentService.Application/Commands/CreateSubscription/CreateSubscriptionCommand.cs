// Application/Commands/CreateSubscription/CreateSubscriptionCommand.cs
using MediatR;
using PaymentService.Application.Interfaces;

namespace PaymentService.Application.Commands.CreateSubscription;

public record CreateSubscriptionCommand(int UserId, string PlanType, string Gateway, int? CoachId, string? IdempotencyKey)
    : IRequest<CreateSubscriptionResult>, IIdempotentRequest;

public record CreateSubscriptionResult(Guid SubscriptionId, string CheckoutUrl);