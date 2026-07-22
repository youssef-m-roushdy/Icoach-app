using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http.Resilience;
using PaymentService.Application.Interfaces;
using PaymentService.Application.Options;
using PaymentService.Domain.Repositories;
using PaymentService.Infrastructure.EventBus;
using PaymentService.Infrastructure.Gateways;
using PaymentService.Infrastructure.Persistence;
using PaymentService.Infrastructure.Repositories;
using Polly;

namespace PaymentService.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<StripeOptions>()
            .Bind(configuration.GetSection(StripeOptions.SectionName));

        services.AddOptions<PaymobOptions>()
            .Bind(configuration.GetSection(PaymobOptions.SectionName));

        services.AddOptions<PayPalOptions>()
            .Bind(configuration.GetSection(PayPalOptions.SectionName));

        services.AddOptions<MainServerOptions>()
            .Bind(configuration.GetSection(MainServerOptions.SectionName));

        services.AddOptions<OutboxOptions>()
            .Bind(configuration.GetSection(OutboxOptions.SectionName));

        services.AddDbContext<PaymentDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("Postgres")));

        services.AddScoped<IPaymentRepository, PaymentRepository>();
        services.AddScoped<ISubscriptionRepository, SubscriptionRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IIdempotencyStore, IdempotencyStore>();
        services.AddScoped<IPaymentGatewayFactory, GatewayFactory>();

        services.AddHttpClient<StripeGateway>(client =>
            {
                client.Timeout = TimeSpan.FromSeconds(30);
            })
            .AddStandardResilienceHandler(options =>
            {
                options.Retry.MaxRetryAttempts = 3;
                options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
                options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(30);
            });

        // Not yet HTTP-backed; register as scoped until full gateway implementations land.
        services.AddScoped<PaymobGateway>();
        services.AddScoped<PayPalGateway>();

        var mainServerTimeout = configuration.GetValue("MainServer:TimeoutSeconds", 10);
        services.AddHttpClient("PaymentWebhookClient", client =>
            {
                client.Timeout = TimeSpan.FromSeconds(mainServerTimeout);
            })
            .AddStandardResilienceHandler(options =>
            {
                options.Retry.MaxRetryAttempts = 2;
                options.Retry.BackoffType = DelayBackoffType.Exponential;
                options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(60);
                options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(Math.Max(mainServerTimeout, 15));
            });

        services.AddSingleton<IIntegrationEventPublisher, IntegrationEventPublisher>();

        return services;
    }
}
