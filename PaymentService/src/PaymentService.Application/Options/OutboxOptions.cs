namespace PaymentService.Application.Options;

public sealed class OutboxOptions
{
    public const string SectionName = "Outbox";

    public int MaxRetries { get; set; } = 5;
    public int BatchSize { get; set; } = 20;
    public int PollIntervalSeconds { get; set; } = 5;
}
