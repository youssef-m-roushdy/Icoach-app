using PaymentService.Domain.Enums;

namespace PaymentService.Application.Interfaces;

public interface IPaymentGatewayFactory
{
    IPaymentGateway Create(GatewayType gateway);
}