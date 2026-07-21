using MediatR;
using PaymentService.Domain.AggregateRoots;

namespace PaymentService.Application.Queries.GetSubscriptionStatus;

public record GetSubscriptionStatusQuery(string UserId) : IRequest<Subscription?>;