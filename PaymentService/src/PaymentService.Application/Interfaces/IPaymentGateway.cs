using PaymentService.Domain.Enums;

namespace PaymentService.Application.Interfaces;

public interface IPaymentGateway
{
    Task<(string CheckoutUrl, string ExternalPaymentId)> CreateCheckoutAsync(Guid paymentId, decimal amount, string currency, CancellationToken ct);
    Task<bool> RefundAsync(string externalPaymentId, CancellationToken ct);
    
    Task<(string CheckoutUrl, string ExternalSubscriptionId)> CreateSubscriptionCheckoutAsync(string userId, SubscriptionPlanType planType, Guid? coachId, CancellationToken ct);
    Task<bool> CancelSubscriptionAsync(string externalSubscriptionId, CancellationToken ct);
    
    bool ValidateWebhookSignature(string payload, string signature);
}