using MediatR;

namespace PaymentService.Application.Commands.CreatePayment;

public record CreatePaymentCommand(int UserId, string OrderId, decimal Amount, string Currency, string Gateway) : IRequest<CreatePaymentResult>;
public record CreatePaymentResult(Guid PaymentId, string CheckoutUrl, string Status);