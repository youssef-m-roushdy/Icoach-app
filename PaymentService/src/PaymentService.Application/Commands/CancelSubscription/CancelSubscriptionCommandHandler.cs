using MediatR;
using PaymentService.Application.Interfaces;
using PaymentService.Domain.Repositories;

namespace PaymentService.Application.Commands.CancelSubscription;

public class CancelSubscriptionCommandHandler : IRequestHandler<CancelSubscriptionCommand, CancelSubscriptionResult>
{
    private readonly ISubscriptionRepository _subscriptionRepo;
    private readonly IPaymentGatewayFactory _gatewayFactory;
    private readonly IUnitOfWork _unitOfWork;

    public CancelSubscriptionCommandHandler(ISubscriptionRepository subscriptionRepo, IPaymentGatewayFactory gatewayFactory, IUnitOfWork unitOfWork)
    {
        _subscriptionRepo = subscriptionRepo;
        _gatewayFactory = gatewayFactory;
        _unitOfWork = unitOfWork;
    }

    public async Task<CancelSubscriptionResult> Handle(CancelSubscriptionCommand request, CancellationToken cancellationToken)
    {
        var subscription = await _subscriptionRepo.GetByIdAsync(request.SubscriptionId, cancellationToken);
        if (subscription == null) return new CancelSubscriptionResult(false, "Not Found");

        var gateway = _gatewayFactory.Create(subscription.Gateway);
        await gateway.CancelSubscriptionAsync(subscription.ExternalSubscriptionId!, cancellationToken);

        subscription.Cancel();
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new CancelSubscriptionResult(true, subscription.Status.ToString());
    }
}