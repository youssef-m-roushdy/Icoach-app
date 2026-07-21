using MediatR;
using PaymentService.Domain.Repositories;

namespace PaymentService.Application.Queries.GetPaymentStatus;

public class GetPaymentStatusQueryHandler : IRequestHandler<GetPaymentStatusQuery, string>
{
    private readonly IPaymentRepository _paymentRepository;

    public GetPaymentStatusQueryHandler(IPaymentRepository paymentRepository)
    {
        _paymentRepository = paymentRepository;
    }

    public async Task<string> Handle(GetPaymentStatusQuery request, CancellationToken cancellationToken)
    {
        var payment = await _paymentRepository.GetByIdAsync(request.PaymentId, cancellationToken);
        return payment?.Status.ToString() ?? "NotFound";
    }
}