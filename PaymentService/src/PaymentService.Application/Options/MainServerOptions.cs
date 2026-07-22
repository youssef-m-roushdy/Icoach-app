namespace PaymentService.Application.Options;

public sealed class MainServerOptions
{
    public const string SectionName = "MainServer";

    public string WebhookBaseUrl { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
    public int TimeoutSeconds { get; set; } = 10;
}
