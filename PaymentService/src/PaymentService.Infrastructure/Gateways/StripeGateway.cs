using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PaymentService.Application.Interfaces;
using PaymentService.Application.Options;
using PaymentService.Domain.Enums;

namespace PaymentService.Infrastructure.Gateways;

public class StripeGateway : IPaymentGateway
{
    private readonly HttpClient _httpClient;
    private readonly StripeOptions _options;
    private readonly ILogger<StripeGateway> _logger;

    public StripeGateway(
        HttpClient httpClient,
        IOptions<StripeOptions> options,
        ILogger<StripeGateway> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;

        if (!string.IsNullOrWhiteSpace(_options.SecretKey))
        {
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _options.SecretKey);
        }
    }

    public async Task<(string CheckoutUrl, string ExternalSessionId)> CreateCheckoutAsync(
        Guid paymentId,
        decimal amount,
        string currency,
        int userId,
        string orderId,
        CancellationToken ct)
    {
        var successUrl = _options.SuccessUrl.Replace("{PAYMENT_ID}", paymentId.ToString(), StringComparison.Ordinal);

        var form = new Dictionary<string, string>
        {
            ["mode"] = "payment",
            ["success_url"] = successUrl,
            ["cancel_url"] = _options.CancelUrl,
            ["line_items[0][price_data][currency]"] = currency.ToLowerInvariant(),
            ["line_items[0][price_data][product_data][name]"] = $"Order {orderId}",
            ["line_items[0][price_data][unit_amount]"] = ((long)(amount * 100)).ToString(CultureInfo.InvariantCulture),
            ["line_items[0][quantity]"] = "1",
            ["client_reference_id"] = paymentId.ToString(),
            ["metadata[paymentId]"] = paymentId.ToString(),
            ["metadata[userId]"] = userId.ToString(CultureInfo.InvariantCulture),
            ["metadata[orderId]"] = orderId,
            ["metadata[gateway]"] = GatewayType.Stripe.ToString(),
            ["payment_intent_data[metadata][paymentId]"] = paymentId.ToString(),
            ["payment_intent_data[metadata][userId]"] = userId.ToString(CultureInfo.InvariantCulture),
            ["payment_intent_data[metadata][orderId]"] = orderId,
            ["payment_intent_data[metadata][gateway]"] = GatewayType.Stripe.ToString()
        };

        var response = await _httpClient.PostAsync("https://api.stripe.com/v1/checkout/sessions",
            new FormUrlEncodedContent(form), ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<StripeSessionResponse>(cancellationToken: ct)
                     ?? throw new InvalidOperationException("Stripe checkout session response was empty.");

        return (result.Url, result.Id);
    }

    public async Task<bool> RefundAsync(string externalPaymentId, CancellationToken ct)
    {
        var form = new Dictionary<string, string> { ["payment_intent"] = externalPaymentId };
        var response = await _httpClient.PostAsync("https://api.stripe.com/v1/refunds",
            new FormUrlEncodedContent(form), ct);
        return response.IsSuccessStatusCode;
    }

    public async Task<(string CheckoutUrl, string ExternalSessionId)> CreateSubscriptionCheckoutAsync(
        Guid subscriptionId,
        int userId,
        SubscriptionPlanType planType,
        int? coachId,
        CancellationToken ct)
    {
        var priceId = planType switch
        {
            SubscriptionPlanType.AppMonthly => _options.Prices.AppMonthly,
            SubscriptionPlanType.AppYearly => _options.Prices.AppYearly,
            SubscriptionPlanType.CoachMonthly => _options.Prices.CoachMonthly,
            SubscriptionPlanType.CoachYearly => _options.Prices.CoachYearly,
            _ => throw new ArgumentOutOfRangeException(nameof(planType))
        };

        if (string.IsNullOrWhiteSpace(priceId))
            throw new InvalidOperationException($"Stripe price is not configured for plan {planType}.");

        var successUrl = _options.SubscriptionSuccessUrl.Replace(
            "{USER_ID}", userId.ToString(CultureInfo.InvariantCulture), StringComparison.Ordinal);

        var form = new Dictionary<string, string>
        {
            ["mode"] = "subscription",
            ["line_items[0][price]"] = priceId,
            ["line_items[0][quantity]"] = "1",
            ["success_url"] = successUrl,
            ["cancel_url"] = _options.SubscriptionCancelUrl,
            ["client_reference_id"] = subscriptionId.ToString(),
            ["metadata[subscriptionId]"] = subscriptionId.ToString(),
            ["metadata[userId]"] = userId.ToString(CultureInfo.InvariantCulture),
            ["metadata[gateway]"] = GatewayType.Stripe.ToString(),
            ["metadata[planType]"] = planType.ToString(),
            ["subscription_data[metadata][subscriptionId]"] = subscriptionId.ToString(),
            ["subscription_data[metadata][userId]"] = userId.ToString(CultureInfo.InvariantCulture),
            ["subscription_data[metadata][gateway]"] = GatewayType.Stripe.ToString(),
            ["subscription_data[metadata][planType]"] = planType.ToString()
        };

        if (coachId.HasValue)
        {
            form["metadata[coachId]"] = coachId.Value.ToString(CultureInfo.InvariantCulture);
            form["subscription_data[metadata][coachId]"] = coachId.Value.ToString(CultureInfo.InvariantCulture);
        }

        var response = await _httpClient.PostAsync("https://api.stripe.com/v1/checkout/sessions",
            new FormUrlEncodedContent(form), ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<StripeSessionResponse>(cancellationToken: ct)
                     ?? throw new InvalidOperationException("Stripe subscription checkout response was empty.");

        return (result.Url, result.Id);
    }

    public async Task<bool> CancelSubscriptionAsync(string externalSubscriptionId, CancellationToken ct)
    {
        var response = await _httpClient.DeleteAsync(
            $"https://api.stripe.com/v1/subscriptions/{externalSubscriptionId}", ct);
        return response.IsSuccessStatusCode;
    }

    public bool ValidateWebhookSignature(string payload, string signatureHeader)
    {
        if (string.IsNullOrWhiteSpace(_options.WebhookSecret))
        {
            _logger.LogError("Stripe webhook secret is not configured.");
            return false;
        }

        if (string.IsNullOrWhiteSpace(signatureHeader))
            return false;

        try
        {
            string? timestamp = null;
            var signatures = new List<string>();

            foreach (var part in signatureHeader.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                var kv = part.Split('=', 2);
                if (kv.Length != 2) continue;

                if (kv[0] == "t") timestamp = kv[1];
                else if (kv[0] == "v1") signatures.Add(kv[1]);
            }

            if (timestamp is null || signatures.Count == 0)
                return false;

            if (!long.TryParse(timestamp, NumberStyles.Integer, CultureInfo.InvariantCulture, out var ts))
                return false;

            var eventTime = DateTimeOffset.FromUnixTimeSeconds(ts);
            var skew = DateTimeOffset.UtcNow - eventTime;
            if (Math.Abs(skew.TotalSeconds) > _options.WebhookToleranceSeconds)
            {
                _logger.LogWarning(
                    "Stripe webhook rejected due to timestamp skew of {SkewSeconds}s.",
                    skew.TotalSeconds);
                return false;
            }

            var signedPayload = $"{timestamp}.{payload}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_options.WebhookSecret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(signedPayload));
            var expected = Convert.ToHexString(hash).ToLowerInvariant();

            foreach (var signature in signatures)
            {
                if (CryptographicOperations.FixedTimeEquals(
                        Encoding.UTF8.GetBytes(expected),
                        Encoding.UTF8.GetBytes(signature.ToLowerInvariant())))
                {
                    return true;
                }
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Stripe webhook signature validation failed unexpectedly.");
            return false;
        }
    }

    private sealed record StripeSessionResponse(string Id, string Url);
}
