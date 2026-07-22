namespace PaymentService.Application.Options;

public sealed class StripeOptions
{
    public const string SectionName = "Stripe";

    public string SecretKey { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
    public string SuccessUrl { get; set; } = "https://app.com/success?paymentId={PAYMENT_ID}";
    public string CancelUrl { get; set; } = "https://app.com/cancel";
    public string SubscriptionSuccessUrl { get; set; } = "https://app.com/sub-success?userId={USER_ID}";
    public string SubscriptionCancelUrl { get; set; } = "https://app.com/sub-cancel";
    public int WebhookToleranceSeconds { get; set; } = 300;
    public StripePriceOptions Prices { get; set; } = new();
}

public sealed class StripePriceOptions
{
    public string AppMonthly { get; set; } = string.Empty;
    public string AppYearly { get; set; } = string.Empty;
    public string CoachMonthly { get; set; } = string.Empty;
    public string CoachYearly { get; set; } = string.Empty;
}
