namespace PaymentService.Domain.Common;

public class OutboxMessage
{
    public Guid Id { get; private set; }
    public string Type { get; private set; } = string.Empty;      // e.g. "SubscriptionActivated", "PaymentSucceeded"
    public string Payload { get; private set; } = string.Empty;   // JSON serialized event
    public DateTime OccurredAt { get; private set; }
    public DateTime? ProcessedAt { get; private set; }
    public int RetryCount { get; private set; }
    public string? LastError { get; private set; }

    private OutboxMessage() { }

    public OutboxMessage(string type, string payload)
    {
        Id = Guid.NewGuid();
        Type = type;
        Payload = payload;
        OccurredAt = DateTime.UtcNow;
        RetryCount = 0;
    }

    public void MarkAsProcessed()
    {
        ProcessedAt = DateTime.UtcNow;
    }

    public void MarkAsFailed(string error)
    {
        RetryCount++;
        LastError = error;
    }
}