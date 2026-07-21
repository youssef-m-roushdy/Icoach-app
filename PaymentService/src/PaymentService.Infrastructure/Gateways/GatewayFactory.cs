using Microsoft.Extensions.DependencyInjection;
using PaymentService.Application.Interfaces;
using PaymentService.Domain.Enums;

namespace PaymentService.Infrastructure.Gateways;

public class GatewayFactory : IPaymentGatewayFactory
{
    private readonly IServiceProvider _provider;

    public GatewayFactory(IServiceProvider provider)
    {
        _provider = provider;
    }

    public IPaymentGateway Create(GatewayType gateway)
    {
        return gateway switch
        {
            GatewayType.Stripe => _provider.GetRequiredService<StripeGateway>(),
            GatewayType.Paymob => _provider.GetRequiredService<PaymobGateway>(),
            GatewayType.PayPal => _provider.GetRequiredService<PayPalGateway>(),
            _ => throw new ArgumentOutOfRangeException(nameof(gateway), $"Gateway '{gateway}' is not supported.")
        };
    }
}