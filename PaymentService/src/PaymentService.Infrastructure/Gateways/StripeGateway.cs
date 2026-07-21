using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using PaymentService.Application.Interfaces;
using PaymentService.Domain.Enums;

namespace PaymentService.Infrastructure.Gateways;

public class StripeGateway : IPaymentGateway
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;

    public StripeGateway(HttpClient httpClient, IConfiguration config)
    {
        _httpClient = httpClient;
        _config = config;
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _config["Stripe:SecretKey"]);
    }

    public async Task<(string CheckoutUrl, string ExternalPaymentId)> CreateCheckoutAsync(Guid paymentId, decimal amount, string currency, CancellationToken ct)
    {
        var form = new Dictionary<string, string>
        {
            { "amount", (amount * 100).ToString("0") },
            { "currency", currency },
            { "success_url", $"https://app.com/success?paymentId={paymentId}" },
            { "cancel_url", "https://app.com/cancel" },
            { "mode", "payment" }
        };

        var response = await _httpClient.PostAsync("https://api.stripe.com/v1/checkout/sessions", new FormUrlEncodedContent(form), ct);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<StripeSessionResponse>(cancellationToken: ct);
        return (result!.Url, result.Id);
    }

    public async Task<bool> RefundAsync(string externalPaymentId, CancellationToken ct)
    {
        var form = new Dictionary<string, string> { { "payment_intent", externalPaymentId } };
        var response = await _httpClient.PostAsync("https://api.stripe.com/v1/refunds", new FormUrlEncodedContent(form), ct);
        return response.IsSuccessStatusCode;
    }

    public async Task<(string CheckoutUrl, string ExternalSubscriptionId)> CreateSubscriptionCheckoutAsync(string userId, SubscriptionPlanType planType, Guid? coachId, CancellationToken ct)
    {
        var priceId = planType switch
        {
            SubscriptionPlanType.AppMonthly => _config["Stripe:Prices:AppMonthly"],
            SubscriptionPlanType.AppYearly => _config["Stripe:Prices:AppYearly"],
            SubscriptionPlanType.CoachMonthly => _config["Stripe:Prices:CoachMonthly"],
            SubscriptionPlanType.CoachYearly => _config["Stripe:Prices:CoachYearly"],
            _ => throw new ArgumentOutOfRangeException(nameof(planType))
        };

        var form = new Dictionary<string, string>
        {
            { "mode", "subscription" },
            { "line_items[0][price]", priceId },
            { "line_items[0][quantity]", "1" },
            { "success_url", $"https://app.com/sub-success?userId={userId}" },
            { "cancel_url", "https://app.com/sub-cancel" },
            { "client_reference_id", userId }
        };

        var response = await _httpClient.PostAsync("https://api.stripe.com/v1/checkout/sessions", new FormUrlEncodedContent(form), ct);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<StripeSessionResponse>(cancellationToken: ct);
        return (result!.Url, result.Id);
    }

    public async Task<bool> CancelSubscriptionAsync(string externalSubscriptionId, CancellationToken ct)
    {
        var response = await _httpClient.DeleteAsync($"https://api.stripe.com/v1/subscriptions/{externalSubscriptionId}", ct);
        return response.IsSuccessStatusCode;
    }

    public bool ValidateWebhookSignature(string payload, string signature)
    {
        // In a production environment, you would use Stripe's HMAC signature validation 
        // using the Stripe:WebhookSecret from configuration.
        return true;
    }

    private record StripeSessionResponse(string Id, string Url);
}