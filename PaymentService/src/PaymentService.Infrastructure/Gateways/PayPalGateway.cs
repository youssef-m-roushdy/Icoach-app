using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PaymentService.Application.Interfaces;
using PaymentService.Application.Options;
using PaymentService.Domain.Enums;

namespace PaymentService.Infrastructure.Gateways;

public class PayPalGateway : IPaymentGateway
{
    private readonly PayPalOptions _options;
    private readonly ILogger<PayPalGateway> _logger;

    public PayPalGateway(IOptions<PayPalOptions> options, ILogger<PayPalGateway> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public Task<(string CheckoutUrl, string ExternalSessionId)> CreateCheckoutAsync(
        Guid paymentId, decimal amount, string currency, int userId, string orderId, CancellationToken ct)
        => throw new NotImplementedException("PayPal checkout is not yet implemented.");

    public Task<bool> RefundAsync(string externalPaymentId, CancellationToken ct)
        => throw new NotImplementedException("PayPal refund is not yet implemented.");

    public Task<(string CheckoutUrl, string ExternalSessionId)> CreateSubscriptionCheckoutAsync(
        Guid subscriptionId, int userId, SubscriptionPlanType planType, int? coachId, CancellationToken ct)
        => throw new NotImplementedException("PayPal subscription checkout is not yet implemented.");

    public Task<bool> CancelSubscriptionAsync(string externalSubscriptionId, CancellationToken ct)
        => throw new NotImplementedException("PayPal subscription cancel is not yet implemented.");

    public bool ValidateWebhookSignature(string payload, string signatureHeader)
    {
        // PayPal verification requires a server-side call to /v1/notifications/verify-webhook-signature.
        // Reject until the full verification flow is implemented so forged webhooks are never accepted.
        _logger.LogWarning(
            "PayPal webhook signature validation is not fully implemented. Rejecting event. WebhookIdConfigured={Configured}",
            !string.IsNullOrWhiteSpace(_options.WebhookId));
        return false;
    }
}
