using FluentAssertions;
using PaymentService.Domain.AggregateRoots;
using PaymentService.Domain.Enums;
using PaymentService.Domain.Events;

namespace PaymentService.UnitTests.Domain;

public class SubscriptionAggregateTests
{
    [Fact]
    public void Activate_FromTrialing_RaisesActivatedEventOnce()
    {
        var subscription = new Subscription(10, SubscriptionPlanType.AppMonthly, GatewayType.Stripe);

        var start = DateTime.UtcNow;
        var end = start.AddMonths(1);
        subscription.Activate("sub_123", start, end);
        subscription.Activate("sub_123", start, end);

        subscription.Status.Should().Be(SubscriptionStatus.Active);
        subscription.DomainEvents.Should().ContainSingle().Which.Should().BeOfType<SubscriptionActivatedEvent>();
    }

    [Fact]
    public void Cancel_DoesNotRaiseDuplicateEvents()
    {
        var subscription = CreateActiveSubscription();

        subscription.Cancel();
        subscription.Cancel();

        subscription.Status.Should().Be(SubscriptionStatus.Canceled);
        subscription.AutoRenew.Should().BeFalse();
        subscription.DomainEvents.Should().ContainSingle().Which.Should().BeOfType<SubscriptionCanceledEvent>();
    }

    [Fact]
    public void MarkAsPastDue_RaisesPastDueEvent()
    {
        var subscription = CreateActiveSubscription();

        subscription.MarkAsPastDue();

        subscription.Status.Should().Be(SubscriptionStatus.PastDue);
        subscription.DomainEvents.Should().ContainSingle().Which.Should().BeOfType<SubscriptionPastDueEvent>();
    }

    [Fact]
    public void Renew_FromPastDue_RaisesRenewedEvent()
    {
        var subscription = CreateActiveSubscription();
        subscription.MarkAsPastDue();
        subscription.ClearDomainEvents();

        var start = DateTime.UtcNow;
        var end = start.AddMonths(1);
        subscription.Renew(start, end);

        subscription.Status.Should().Be(SubscriptionStatus.Active);
        subscription.DomainEvents.Should().ContainSingle().Which.Should().BeOfType<SubscriptionRenewedEvent>();
    }

    [Fact]
    public void Expire_RaisesExpiredEvent()
    {
        var subscription = CreateActiveSubscription();

        subscription.Expire();

        subscription.Status.Should().Be(SubscriptionStatus.Expired);
        subscription.AutoRenew.Should().BeFalse();
        subscription.DomainEvents.Should().ContainSingle().Which.Should().BeOfType<SubscriptionExpiredEvent>();
    }

    [Fact]
    public void Renew_SamePeriod_IsIdempotent()
    {
        var subscription = CreateActiveSubscription();
        var start = subscription.CurrentPeriodStart;
        var end = subscription.CurrentPeriodEnd;
        subscription.ClearDomainEvents();

        subscription.Renew(start, end);

        subscription.DomainEvents.Should().BeEmpty();
    }

    private static Subscription CreateActiveSubscription()
    {
        var subscription = new Subscription(10, SubscriptionPlanType.AppMonthly, GatewayType.Stripe, coachId: 5);
        var start = DateTime.UtcNow.Date;
        var end = start.AddMonths(1);
        subscription.Activate("sub_123", start, end);
        subscription.ClearDomainEvents();
        return subscription;
    }
}
