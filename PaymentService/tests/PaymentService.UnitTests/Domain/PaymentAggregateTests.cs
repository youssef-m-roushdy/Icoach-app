using FluentAssertions;
using PaymentService.Domain.AggregateRoots;
using PaymentService.Domain.Enums;
using PaymentService.Domain.Events;

namespace PaymentService.UnitTests.Domain;

public class PaymentAggregateTests
{
    [Fact]
    public void MarkAsPaid_FromProcessing_RaisesSucceededEventOnce()
    {
        var payment = CreateProcessingPayment();

        payment.MarkAsPaid("pi_123");
        payment.MarkAsPaid("pi_123");

        payment.Status.Should().Be(PaymentStatus.Paid);
        payment.ExternalPaymentId.Should().Be("pi_123");
        payment.DomainEvents.Should().ContainSingle().Which.Should().BeOfType<PaymentSucceededEvent>();
    }

    [Fact]
    public void MarkAsPaid_FromPaid_IsIdempotent()
    {
        var payment = CreateProcessingPayment();
        payment.MarkAsPaid("pi_123");
        payment.ClearDomainEvents();

        payment.MarkAsPaid("pi_123");

        payment.DomainEvents.Should().BeEmpty();
        payment.Status.Should().Be(PaymentStatus.Paid);
    }

    [Fact]
    public void MarkAsFailed_FromPaid_Throws()
    {
        var payment = CreateProcessingPayment();
        payment.MarkAsPaid("pi_123");

        var act = () => payment.MarkAsFailed("nope");

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void MarkAsRefunded_FromPaid_RaisesRefundedEvent()
    {
        var payment = CreateProcessingPayment();
        payment.MarkAsPaid("pi_123");
        payment.ClearDomainEvents();

        payment.MarkAsRefunded();

        payment.Status.Should().Be(PaymentStatus.Refunded);
        payment.DomainEvents.Should().ContainSingle().Which.Should().BeOfType<PaymentRefundedEvent>();
    }

    [Fact]
    public void MarkAsCancelled_FromProcessing_RaisesCancelledEvent()
    {
        var payment = CreateProcessingPayment();

        payment.MarkAsCancelled();

        payment.Status.Should().Be(PaymentStatus.Cancelled);
        payment.DomainEvents.Should().ContainSingle().Which.Should().BeOfType<PaymentCancelledEvent>();
    }

    [Fact]
    public void MarkAsFailed_RaisesFailedEvent()
    {
        var payment = CreateProcessingPayment();

        payment.MarkAsFailed("card declined");

        payment.Status.Should().Be(PaymentStatus.Failed);
        payment.FailureReason.Should().Be("card declined");
        payment.DomainEvents.Should().ContainSingle().Which.Should().BeOfType<PaymentFailedEvent>();
    }

    private static Payment CreateProcessingPayment()
    {
        var payment = new Payment(1, "order-1", 99.99m, "usd", GatewayType.Stripe);
        payment.SetCheckoutUrl("https://checkout.stripe.com/session", "cs_test_123");
        return payment;
    }
}
