using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PaymentService.Application.Interfaces;
using PaymentService.Domain.Repositories;
using PaymentService.Infrastructure.EventBus;
using PaymentService.Infrastructure.Gateways;
using PaymentService.Infrastructure.Persistence;
using PaymentService.Infrastructure.Repositories;

namespace PaymentService.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<PaymentDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("Postgres")));

        services.AddScoped<IPaymentRepository, PaymentRepository>();
        services.AddScoped<ISubscriptionRepository, SubscriptionRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        services.AddHttpClient<StripeGateway>();
        services.AddHttpClient<PaymobGateway>();
        services.AddHttpClient<PayPalGateway>();
        services.AddHttpClient("PaymentWebhookClient");
        
        services.AddSingleton<IPaymentGatewayFactory, GatewayFactory>();
        services.AddSingleton<IIntegrationEventPublisher, IntegrationEventPublisher>();

        return services;
    }
}