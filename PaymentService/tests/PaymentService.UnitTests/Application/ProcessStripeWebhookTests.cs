using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using PaymentService.Application.Commands.ProcessStripeWebhook;
using PaymentService.Application.Interfaces;
using PaymentService.Domain.AggregateRoots;
using PaymentService.Domain.Enums;
using PaymentService.Domain.Repositories;

namespace PaymentService.UnitTests.Application;

public class ProcessStripeWebhookTests
{
    [Fact]
    public async Task Handle_PaymentIntentSucceeded_MarksPaymentPaid_AndCommitsOnce()
    {
        var payment = new Payment(1, "ord-1", 25m, "USD", GatewayType.Stripe);
        payment.SetCheckoutUrl("https://pay", "cs_1");

        var paymentRepo = new Mock<IPaymentRepository>();
        paymentRepo.Setup(r => r.GetByIdAsync(payment.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(payment);

        var subRepo = new Mock<ISubscriptionRepository>();
        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var idempotency = new Mock<IIdempotencyStore>();
        idempotency.Setup(s => s.GetResponseAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string?)null);

        var handler = new ProcessStripeWebhookCommandHandler(
            paymentRepo.Object,
            subRepo.Object,
            uow.Object,
            idempotency.Object,
            NullLogger<ProcessStripeWebhookCommandHandler>.Instance);

        var payload = $$"""
        {
          "id": "evt_1",
          "type": "payment_intent.succeeded",
          "data": {
            "object": {
              "id": "pi_123",
              "metadata": { "paymentId": "{{payment.Id}}" }
            }
          }
        }
        """;

        var result = await handler.Handle(
            new ProcessStripeWebhookCommand("evt_1", "payment_intent.succeeded", payload),
            CancellationToken.None);

        result.Should().BeTrue();
        payment.Status.Should().Be(PaymentStatus.Paid);
        payment.ExternalPaymentId.Should().Be("pi_123");

        idempotency.Verify(s => s.SaveResponseAsync("evt_1", nameof(ProcessStripeWebhookCommand), "true", It.IsAny<CancellationToken>()), Times.Once);
        uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_DuplicateEvent_ShortCircuitsWithoutSave()
    {
        var paymentRepo = new Mock<IPaymentRepository>();
        var subRepo = new Mock<ISubscriptionRepository>();
        var uow = new Mock<IUnitOfWork>();
        var idempotency = new Mock<IIdempotencyStore>();
        idempotency.Setup(s => s.GetResponseAsync("evt_dup", It.IsAny<CancellationToken>()))
            .ReturnsAsync("true");

        var handler = new ProcessStripeWebhookCommandHandler(
            paymentRepo.Object,
            subRepo.Object,
            uow.Object,
            idempotency.Object,
            NullLogger<ProcessStripeWebhookCommandHandler>.Instance);

        var result = await handler.Handle(
            new ProcessStripeWebhookCommand("evt_dup", "payment_intent.succeeded", "{}"),
            CancellationToken.None);

        result.Should().BeTrue();
        uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        paymentRepo.Verify(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_InvoicePaymentFailed_MarksSubscriptionPastDue()
    {
        var subscription = new Subscription(9, SubscriptionPlanType.AppMonthly, GatewayType.Stripe);
        var start = DateTime.UtcNow;
        subscription.Activate("sub_abc", start, start.AddMonths(1));
        subscription.ClearDomainEvents();

        var paymentRepo = new Mock<IPaymentRepository>();
        var subRepo = new Mock<ISubscriptionRepository>();
        subRepo.Setup(r => r.GetByExternalSubscriptionIdAsync("sub_abc", It.IsAny<CancellationToken>()))
            .ReturnsAsync(subscription);

        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var idempotency = new Mock<IIdempotencyStore>();
        idempotency.Setup(s => s.GetResponseAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string?)null);

        var handler = new ProcessStripeWebhookCommandHandler(
            paymentRepo.Object,
            subRepo.Object,
            uow.Object,
            idempotency.Object,
            NullLogger<ProcessStripeWebhookCommandHandler>.Instance);

        const string payload = """
        {
          "id": "evt_inv",
          "type": "invoice.payment_failed",
          "data": {
            "object": {
              "id": "in_1",
              "subscription": "sub_abc"
            }
          }
        }
        """;

        await handler.Handle(
            new ProcessStripeWebhookCommand("evt_inv", "invoice.payment_failed", payload),
            CancellationToken.None);

        subscription.Status.Should().Be(SubscriptionStatus.PastDue);
        uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
