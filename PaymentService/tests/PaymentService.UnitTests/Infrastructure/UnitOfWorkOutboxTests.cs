using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using PaymentService.Domain.AggregateRoots;
using PaymentService.Domain.Enums;
using PaymentService.Infrastructure.Persistence;
using PaymentService.Infrastructure.Repositories;

namespace PaymentService.UnitTests.Infrastructure;

public class UnitOfWorkOutboxTests
{
    [Fact]
    public async Task SaveChangesAsync_WritesOutboxMessagesFromDomainEvents()
    {
        await using var db = CreateDbContext();
        var uow = new UnitOfWork(db);

        var payment = new Payment(1, "ord-1", 10m, "USD", GatewayType.Stripe);
        payment.SetCheckoutUrl("https://pay", "cs_1");
        payment.MarkAsPaid("pi_1");
        db.Payments.Add(payment);

        await uow.SaveChangesAsync(CancellationToken.None);

        var outbox = await db.OutboxMessages.ToListAsync();
        outbox.Should().ContainSingle();
        outbox[0].Type.Should().Be("PaymentSucceeded");
        outbox[0].Payload.Should().Contain("ord-1");
        payment.DomainEvents.Should().BeEmpty();
    }

    [Fact]
    public async Task SaveChangesAsync_WritesSubscriptionPastDueOutbox()
    {
        await using var db = CreateDbContext();
        var uow = new UnitOfWork(db);

        var subscription = new Subscription(2, SubscriptionPlanType.AppMonthly, GatewayType.Stripe);
        var start = DateTime.UtcNow;
        subscription.Activate("sub_1", start, start.AddMonths(1));
        subscription.ClearDomainEvents();
        subscription.MarkAsPastDue();
        db.Subscriptions.Add(subscription);

        await uow.SaveChangesAsync(CancellationToken.None);

        var outbox = await db.OutboxMessages.SingleAsync();
        outbox.Type.Should().Be("SubscriptionPastDue");
    }

    private static PaymentDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<PaymentDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new PaymentDbContext(options);
    }
}
