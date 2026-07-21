using PaymentService.Application.Interfaces;

namespace PaymentService.Infrastructure.EventBus;

public class IntegrationEventPublisher : IIntegrationEventPublisher
{
    public Task PublishAsync<T>(T @event, CancellationToken ct) where T : class
    {
        // In a production environment, this method would serialize the event
        // and publish it to RabbitMQ, Kafka, or Azure Service Bus.
        return Task.CompletedTask;
    }
}