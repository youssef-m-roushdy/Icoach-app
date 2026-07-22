using PaymentService.Domain.Enums;

namespace PaymentService.Application.Interfaces;

public interface IPaymentGateway
{
    Task<(string CheckoutUrl, string ExternalSessionId)> CreateCheckoutAsync(
        Guid paymentId,
        decimal amount,
        string currency,
        int userId,
        string orderId,
        CancellationToken ct);

    Task<bool> RefundAsync(string externalPaymentId, CancellationToken ct);

    Task<(string CheckoutUrl, string ExternalSessionId)> CreateSubscriptionCheckoutAsync(
        Guid subscriptionId,
        int userId,
        SubscriptionPlanType planType,
        int? coachId,
        CancellationToken ct);

    Task<bool> CancelSubscriptionAsync(string externalSubscriptionId, CancellationToken ct);

    bool ValidateWebhookSignature(string payload, string signatureHeader);
}
