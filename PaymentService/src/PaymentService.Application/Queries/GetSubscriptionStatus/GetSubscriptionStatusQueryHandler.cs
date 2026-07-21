using MediatR;
using PaymentService.Domain.AggregateRoots;
using PaymentService.Domain.Repositories;

namespace PaymentService.Application.Queries.GetSubscriptionStatus;

public class GetSubscriptionStatusQueryHandler : IRequestHandler<GetSubscriptionStatusQuery, Subscription?>
{
    private readonly ISubscriptionRepository _subscriptionRepository;

    public GetSubscriptionStatusQueryHandler(ISubscriptionRepository subscriptionRepository)
    {
        _subscriptionRepository = subscriptionRepository;
    }

    public async Task<Subscription?> Handle(GetSubscriptionStatusQuery request, CancellationToken cancellationToken)
    {
        return await _subscriptionRepository.GetActiveByUserIdAsync(request.UserId, cancellationToken);
    }
}