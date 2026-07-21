using MediatR;
using PaymentService.Domain.AggregateRoots;

namespace PaymentService.Application.Queries.GetSubscriptionStatus;

public record GetSubscriptionStatusQuery(int UserId) : IRequest<Subscription?>;