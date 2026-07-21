namespace PaymentService.Application.Interfaces;

public interface IIntegrationEventPublisher
{
    Task PublishAsync<T>(T @event, CancellationToken ct) where T : class;
}