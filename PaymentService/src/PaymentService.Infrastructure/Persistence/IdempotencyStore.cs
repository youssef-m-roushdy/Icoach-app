// Infrastructure/Persistence/IdempotencyStore.cs
using Microsoft.EntityFrameworkCore;
using PaymentService.Application.Interfaces;
using PaymentService.Domain.Common;

namespace PaymentService.Infrastructure.Persistence;

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

    public async Task SaveResponseAsync(string key, string requestType, string responsePayload, CancellationToken ct)
    {
        var record = new IdempotencyRecord(key, requestType, responsePayload);
        _context.IdempotencyRecords.Add(record);

        try
        {
            await _context.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Two concurrent requests raced with the same key — the other one won,
            // its record is already saved, so there's nothing more to do here.
        }
    }
}