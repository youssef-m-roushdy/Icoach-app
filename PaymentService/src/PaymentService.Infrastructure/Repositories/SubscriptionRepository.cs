using Microsoft.EntityFrameworkCore;
using PaymentService.Domain.AggregateRoots;
using PaymentService.Domain.Enums;
using PaymentService.Domain.Repositories;
using PaymentService.Infrastructure.Persistence;

namespace PaymentService.Infrastructure.Repositories;

public class SubscriptionRepository : ISubscriptionRepository
{
    private readonly PaymentDbContext _context;

    public SubscriptionRepository(PaymentDbContext context)
    {
        _context = context;
    }

    public async Task<Subscription?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _context.Subscriptions.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
    }

    public async Task<Subscription?> GetByExternalSubscriptionIdAsync(string externalSubscriptionId, CancellationToken cancellationToken)
    {
        return await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.ExternalSubscriptionId == externalSubscriptionId, cancellationToken);
    }

    public async Task<Subscription?> GetByExternalSessionIdAsync(string sessionId, CancellationToken cancellationToken)
    {
        return await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.ExternalSessionId == sessionId, cancellationToken);
    }

    public async Task<Subscription?> GetActiveByUserIdAsync(int userId, CancellationToken cancellationToken)
    {
        return await _context.Subscriptions
            .Where(s => s.UserId == userId &&
                        (s.Status == SubscriptionStatus.Active ||
                         s.Status == SubscriptionStatus.Trialing ||
                         s.Status == SubscriptionStatus.PastDue))
            .OrderByDescending(s => s.CurrentPeriodEnd)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task AddAsync(Subscription subscription, CancellationToken cancellationToken)
    {
        await _context.Subscriptions.AddAsync(subscription, cancellationToken);
    }

    public void Update(Subscription subscription)
    {
        _context.Subscriptions.Update(subscription);
    }
}
