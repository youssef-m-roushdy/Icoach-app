using PaymentService.Application.Interfaces;
using PaymentService.Domain.Enums;

namespace PaymentService.Infrastructure.Gateways;

public class PayPalGateway : IPaymentGateway
{
    public Task<(string CheckoutUrl, string ExternalPaymentId)> CreateCheckoutAsync(Guid paymentId, decimal amount, string currency, CancellationToken ct)
    {
        throw new NotImplementedException("PayPal integration is not yet implemented.");
    }

    public Task<bool> RefundAsync(string externalPaymentId, CancellationToken ct)
    {
        throw new NotImplementedException("PayPal integration is not yet implemented.");
    }

    public Task<(string CheckoutUrl, string ExternalSubscriptionId)> CreateSubscriptionCheckoutAsync(string userId, SubscriptionPlanType planType, Guid? coachId, CancellationToken ct)
    {
        throw new NotImplementedException("PayPal integration is not yet implemented.");
    }

    public Task<bool> CancelSubscriptionAsync(string externalSubscriptionId, CancellationToken ct)
    {
        throw new NotImplementedException("PayPal integration is not yet implemented.");
    }

    public bool ValidateWebhookSignature(string payload, string signature)
    {
        throw new NotImplementedException("PayPal integration is not yet implemented.");
    }
}