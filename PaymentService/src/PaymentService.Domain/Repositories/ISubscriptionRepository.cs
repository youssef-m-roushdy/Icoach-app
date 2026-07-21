using PaymentService.Domain.AggregateRoots;

namespace PaymentService.Domain.Repositories;

public interface ISubscriptionRepository
{
    Task<Subscription?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Subscription?> GetActiveByUserIdAsync(string userId, CancellationToken cancellationToken);
    Task AddAsync(Subscription subscription, CancellationToken cancellationToken);
    void Update(Subscription subscription);
}