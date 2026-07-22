namespace PaymentService.Domain.Common;

public class OutboxMessage
{
    public Guid Id { get; private set; }
    public string Type { get; private set; } = string.Empty;
    public string Payload { get; private set; } = string.Empty;
    public DateTime OccurredAt { get; private set; }
    public DateTime AvailableAt { get; private set; }
    public DateTime? ProcessedAt { get; private set; }
    public int RetryCount { get; private set; }
    public string? LastError { get; private set; }
    public bool IsDeadLettered { get; private set; }

    private OutboxMessage() { }

    public OutboxMessage(string type, string payload)
    {
        if (string.IsNullOrWhiteSpace(type)) throw new ArgumentException("Type is required.", nameof(type));
        if (string.IsNullOrWhiteSpace(payload)) throw new ArgumentException("Payload is required.", nameof(payload));

        Id = Guid.NewGuid();
        Type = type;
        Payload = payload;
        OccurredAt = DateTime.UtcNow;
        AvailableAt = OccurredAt;
        RetryCount = 0;
        IsDeadLettered = false;
    }

    public void MarkAsProcessed()
    {
        ProcessedAt = DateTime.UtcNow;
        LastError = null;
    }

    public void MarkAsFailed(string error, int maxRetries)
    {
        RetryCount++;
        LastError = Truncate(error, 1000);

        if (RetryCount >= maxRetries)
        {
            MarkAsDeadLettered(LastError);
            return;
        }

        // Exponential backoff: 5s, 10s, 20s, 40s... capped at 1 hour.
        var delaySeconds = Math.Min(5 * Math.Pow(2, RetryCount - 1), 3600);
        AvailableAt = DateTime.UtcNow.AddSeconds(delaySeconds);
    }

    public void MarkAsDeadLettered(string? error)
    {
        IsDeadLettered = true;
        ProcessedAt = DateTime.UtcNow;
        LastError = Truncate(error ?? "Dead-lettered after max retries.", 1000);
    }

    private static string Truncate(string value, int max)
        => value.Length <= max ? value : value[..max];
}
