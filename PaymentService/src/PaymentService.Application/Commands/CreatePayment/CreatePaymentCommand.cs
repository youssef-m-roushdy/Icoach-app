// Application/Commands/CreatePayment/CreatePaymentCommand.cs
using MediatR;
using PaymentService.Application.Interfaces;

namespace PaymentService.Application.Commands.CreatePayment;

public record CreatePaymentCommand(int UserId, string OrderId, decimal Amount, string Currency, string Gateway, string? IdempotencyKey)
    : IRequest<CreatePaymentResult>, IIdempotentRequest;

public record CreatePaymentResult(Guid PaymentId, string CheckoutUrl, string Status);