using MediatR;
using PaymentService.Application.Interfaces;
using PaymentService.Domain.Repositories;

namespace PaymentService.Application.Commands.RefundPayment;

public class RefundPaymentCommandHandler : IRequestHandler<RefundPaymentCommand, RefundPaymentResult>
{
    private readonly IPaymentRepository _paymentRepository;
    private readonly IPaymentGatewayFactory _gatewayFactory;
    private readonly IUnitOfWork _unitOfWork;

    public RefundPaymentCommandHandler(IPaymentRepository paymentRepository, IPaymentGatewayFactory gatewayFactory, IUnitOfWork unitOfWork)
    {
        _paymentRepository = paymentRepository;
        _gatewayFactory = gatewayFactory;
        _unitOfWork = unitOfWork;
    }

    public async Task<RefundPaymentResult> Handle(RefundPaymentCommand request, CancellationToken cancellationToken)
    {
        var payment = await _paymentRepository.GetByIdAsync(request.PaymentId, cancellationToken);
        if (payment == null) return new RefundPaymentResult(false, "Payment not found.");
        if (payment.Status == Domain.Enums.PaymentStatus.Refunded) return new RefundPaymentResult(false, "Already refunded.");

        var gateway = _gatewayFactory.Create(payment.Gateway);
        var success = await gateway.RefundAsync(payment.ExternalPaymentId!, cancellationToken);

        if (success)
        {
            payment.MarkAsRefunded();
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return new RefundPaymentResult(true, "Refund processed successfully.");
        }

        return new RefundPaymentResult(false, "Gateway refund failed.");
    }
}