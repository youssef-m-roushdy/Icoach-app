using MediatR;
using PaymentService.Application.Interfaces;
using PaymentService.Domain.AggregateRoots;
using PaymentService.Domain.Enums;
using PaymentService.Domain.Repositories;

namespace PaymentService.Application.Commands.CreateSubscription;

public class CreateSubscriptionCommandHandler : IRequestHandler<CreateSubscriptionCommand, CreateSubscriptionResult>
{
    private readonly ISubscriptionRepository _subscriptionRepo;
    private readonly IPaymentGatewayFactory _gatewayFactory;
    private readonly IUnitOfWork _unitOfWork;

    public CreateSubscriptionCommandHandler(ISubscriptionRepository subscriptionRepo, IPaymentGatewayFactory gatewayFactory, IUnitOfWork unitOfWork)
    {
        _subscriptionRepo = subscriptionRepo;
        _gatewayFactory = gatewayFactory;
        _unitOfWork = unitOfWork;
    }

    public async Task<CreateSubscriptionResult> Handle(CreateSubscriptionCommand request, CancellationToken cancellationToken)
    {
        var planType = Enum.Parse<SubscriptionPlanType>(request.PlanType, true);
        var gatewayType = Enum.Parse<GatewayType>(request.Gateway, true);

        var subscription = new Subscription(request.UserId, planType, gatewayType, request.CoachId);
        await _subscriptionRepo.AddAsync(subscription, cancellationToken);

        var gateway = _gatewayFactory.Create(gatewayType);
        var (checkoutUrl, _) = await gateway.CreateSubscriptionCheckoutAsync(request.UserId, planType, request.CoachId, cancellationToken);
        
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new CreateSubscriptionResult(subscription.Id, checkoutUrl);
    }
}