using FluentValidation;
using PaymentService.Domain.Enums;

namespace PaymentService.Application.Commands.CreatePayment;

public class CreatePaymentCommandValidator : AbstractValidator<CreatePaymentCommand>
{
    public CreatePaymentCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.OrderId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Currency).Length(3);
        RuleFor(x => x.Gateway).Must(g => Enum.TryParse<GatewayType>(g, true, out _)).WithMessage("Invalid Gateway specified.");
    }
}