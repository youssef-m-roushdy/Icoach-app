using MediatR;

namespace PaymentService.Application.Commands.RefundPayment;

public record RefundPaymentCommand(Guid PaymentId) : IRequest<RefundPaymentResult>;
public record RefundPaymentResult(bool Success, string Message);