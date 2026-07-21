using FluentValidation;
using PaymentService.Domain.Enums;

namespace PaymentService.Application.Commands.CreateSubscription;

public class CreateSubscriptionCommandValidator : AbstractValidator<CreateSubscriptionCommand>
{
    public CreateSubscriptionCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.PlanType).Must(p => Enum.TryParse<SubscriptionPlanType>(p, true, out _)).WithMessage("Invalid Subscription Plan Type.");
        RuleFor(x => x.Gateway).Must(g => Enum.TryParse<GatewayType>(g, true, out _)).WithMessage("Invalid Gateway specified.");
    }
}