// Application/Behaviors/IdempotencyBehavior.cs
using System.Text.Json;
using MediatR;
using Microsoft.Extensions.Logging;
using PaymentService.Application.Interfaces;

namespace PaymentService.Application.Behaviors;

public class IdempotencyBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly IIdempotencyStore _store;
    private readonly ILogger<IdempotencyBehavior<TRequest, TResponse>> _logger;

    public IdempotencyBehavior(IIdempotencyStore store, ILogger<IdempotencyBehavior<TRequest, TResponse>> logger)
    {
        _store = store;
        _logger = logger;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (request is not IIdempotentRequest idempotentRequest || string.IsNullOrWhiteSpace(idempotentRequest.IdempotencyKey))
        {
            // No key supplied — behave normally (not every command needs to be idempotent).
            return await next();
        }

        var key = idempotentRequest.IdempotencyKey;

        var cachedPayload = await _store.GetResponseAsync(key, cancellationToken);
        if (cachedPayload is not null)
        {
            _logger.LogInformation("Idempotency key {Key} already processed for {RequestType}, returning cached response.", key, typeof(TRequest).Name);
            return JsonSerializer.Deserialize<TResponse>(cachedPayload)!;
        }

        var response = await next();

        var payload = JsonSerializer.Serialize(response);
        await _store.SaveResponseAsync(key, typeof(TRequest).Name, payload, cancellationToken);

        return response;
    }
}