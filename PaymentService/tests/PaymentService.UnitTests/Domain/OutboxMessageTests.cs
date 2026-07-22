using FluentAssertions;
using PaymentService.Domain.Common;

namespace PaymentService.UnitTests.Domain;

public class OutboxMessageTests
{
    [Fact]
    public void MarkAsFailed_AppliesExponentialBackoff()
    {
        var message = new OutboxMessage("PaymentSucceeded", "{\"paymentId\":\"x\"}");
        var before = DateTime.UtcNow;

        message.MarkAsFailed("timeout", maxRetries: 5);

        message.RetryCount.Should().Be(1);
        message.IsDeadLettered.Should().BeFalse();
        message.AvailableAt.Should().BeOnOrAfter(before.AddSeconds(4));
    }

    [Fact]
    public void MarkAsFailed_DeadLettersAfterMaxRetries()
    {
        var message = new OutboxMessage("PaymentSucceeded", "{\"paymentId\":\"x\"}");

        message.MarkAsFailed("err1", maxRetries: 2);
        message.MarkAsFailed("err2", maxRetries: 2);

        message.IsDeadLettered.Should().BeTrue();
        message.ProcessedAt.Should().NotBeNull();
        message.RetryCount.Should().Be(2);
    }
}
