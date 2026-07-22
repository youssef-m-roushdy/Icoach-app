namespace PaymentService.Application.Options;

public sealed class PaymobOptions
{
    public const string SectionName = "Paymob";

    public string ApiKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string PublicKey { get; set; } = string.Empty;
    public string WebhookHmacSecret { get; set; } = string.Empty;
    public int IntegrationId { get; set; }
    public string BaseUrl { get; set; } = "https://accept.paymob.com/api";
}
