using Microsoft.EntityFrameworkCore;
using PaymentService.Application.Interfaces;
using PaymentService.Domain.Common;

namespace PaymentService.Infrastructure.Persistence;

/// <summary>
/// Stages idempotency records on the shared DbContext.
/// Persistence is owned exclusively by <c>IUnitOfWork.SaveChangesAsync</c>
/// so domain changes, outbox messages, and idempotency share one transaction.
/// </summary>
public class IdempotencyStore : IIdempotencyStore
{
    private readonly PaymentDbContext _context;

    public IdempotencyStore(PaymentDbContext context)
    {
        _context = context;
    }

    public async Task<string?> GetResponseAsync(string key, CancellationToken ct)
    {
        var record = await _context.IdempotencyRecords
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Key == key, ct);

        return record?.ResponsePayload;
    }

    public Task SaveResponseAsync(string key, string requestType, string responsePayload, CancellationToken ct)
    {
        // Avoid duplicate tracked inserts within the same unit of work.
        var alreadyTracked = _context.ChangeTracker
            .Entries<IdempotencyRecord>()
            .Any(e => e.Entity.Key == key);

        if (alreadyTracked)
            return Task.CompletedTask;

        _context.IdempotencyRecords.Add(new IdempotencyRecord(key, requestType, responsePayload));
        return Task.CompletedTask;
    }
}
