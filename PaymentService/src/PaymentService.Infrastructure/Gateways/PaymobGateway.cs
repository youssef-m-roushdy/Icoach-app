using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PaymentService.Application.Interfaces;
using PaymentService.Application.Options;
using PaymentService.Domain.Enums;

namespace PaymentService.Infrastructure.Gateways;

public class PaymobGateway : IPaymentGateway
{
    private readonly PaymobOptions _options;
    private readonly ILogger<PaymobGateway> _logger;

    public PaymobGateway(IOptions<PaymobOptions> options, ILogger<PaymobGateway> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public Task<(string CheckoutUrl, string ExternalSessionId)> CreateCheckoutAsync(
        Guid paymentId, decimal amount, string currency, int userId, string orderId, CancellationToken ct)
        => throw new NotImplementedException("Paymob checkout is not yet implemented.");

    public Task<bool> RefundAsync(string externalPaymentId, CancellationToken ct)
        => throw new NotImplementedException("Paymob refund is not yet implemented.");

    public Task<(string CheckoutUrl, string ExternalSessionId)> CreateSubscriptionCheckoutAsync(
        Guid subscriptionId, int userId, SubscriptionPlanType planType, int? coachId, CancellationToken ct)
        => throw new NotImplementedException("Paymob subscription checkout is not yet implemented.");

    public Task<bool> CancelSubscriptionAsync(string externalSubscriptionId, CancellationToken ct)
        => throw new NotImplementedException("Paymob subscription cancel is not yet implemented.");

    public bool ValidateWebhookSignature(string payload, string signatureHeader)
    {
        if (string.IsNullOrWhiteSpace(_options.WebhookHmacSecret))
        {
            _logger.LogError("Paymob webhook HMAC secret is not configured.");
            return false;
        }

        if (string.IsNullOrWhiteSpace(signatureHeader))
            return false;

        using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(_options.WebhookHmacSecret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var expected = Convert.ToHexString(hash).ToLowerInvariant();

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signatureHeader.ToLowerInvariant()));
    }
}
