using MediatR;

namespace PaymentService.Application.Queries.GetPaymentStatus;

public record GetPaymentStatusQuery(Guid PaymentId) : IRequest<string>;