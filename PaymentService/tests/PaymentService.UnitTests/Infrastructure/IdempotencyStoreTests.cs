using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using PaymentService.Infrastructure.Persistence;
using PaymentService.Infrastructure.Repositories;

namespace PaymentService.UnitTests.Infrastructure;

public class IdempotencyStoreTests
{
    [Fact]
    public async Task SaveResponseAsync_DoesNotCommit_UntilUnitOfWorkSaveChanges()
    {
        var options = new DbContextOptionsBuilder<PaymentDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var db = new PaymentDbContext(options);
        var store = new IdempotencyStore(db);
        var uow = new UnitOfWork(db);

        await store.SaveResponseAsync("evt_1", "ProcessStripeWebhookCommand", "true", CancellationToken.None);

        (await db.IdempotencyRecords.CountAsync()).Should().Be(0);

        await uow.SaveChangesAsync(CancellationToken.None);

        (await db.IdempotencyRecords.CountAsync()).Should().Be(1);
        (await store.GetResponseAsync("evt_1", CancellationToken.None)).Should().Be("true");
    }
}
