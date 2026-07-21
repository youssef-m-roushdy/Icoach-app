using MediatR;
using PaymentService.Application.Interfaces;
using PaymentService.Domain.AggregateRoots;
using PaymentService.Domain.Enums;
using PaymentService.Domain.Repositories;

namespace PaymentService.Application.Commands.CreatePayment;

public class CreatePaymentCommandHandler : IRequestHandler<CreatePaymentCommand, CreatePaymentResult>
{
    private readonly IPaymentRepository _paymentRepository;
    private readonly IPaymentGatewayFactory _gatewayFactory;
    private readonly IUnitOfWork _unitOfWork;

    public CreatePaymentCommandHandler(IPaymentRepository paymentRepository, IPaymentGatewayFactory gatewayFactory, IUnitOfWork unitOfWork)
    {
        _paymentRepository = paymentRepository;
        _gatewayFactory = gatewayFactory;
        _unitOfWork = unitOfWork;
    }

    public async Task<CreatePaymentResult> Handle(CreatePaymentCommand request, CancellationToken cancellationToken)
    {
        var gatewayType = Enum.Parse<GatewayType>(request.Gateway, true);
        var payment = new Payment(request.UserId, request.OrderId, request.Amount, request.Currency, gatewayType);
        
        await _paymentRepository.AddAsync(payment, cancellationToken);
        
        var gatewayService = _gatewayFactory.Create(gatewayType);
        var (checkoutUrl, externalId) = await gatewayService.CreateCheckoutAsync(payment.Id, payment.Amount, payment.Currency, cancellationToken);
        
        payment.SetCheckoutUrl(checkoutUrl);
        
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        
        return new CreatePaymentResult(payment.Id, checkoutUrl, payment.Status.ToString());
    }
}