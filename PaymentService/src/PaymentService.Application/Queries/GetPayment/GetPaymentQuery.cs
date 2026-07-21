using MediatR;
using PaymentService.Domain.AggregateRoots;

namespace PaymentService.Application.Queries.GetPayment;

public record GetPaymentQuery(Guid PaymentId) : IRequest<Payment?>;