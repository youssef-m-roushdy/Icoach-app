using System.Text.Json;
using MediatR;
using Microsoft.Extensions.Logging;
using PaymentService.Application.Interfaces;
using PaymentService.Domain.Repositories;

namespace PaymentService.Application.Behaviors;

/// <summary>
/// For <see cref="IIdempotentRequest"/> commands, domain mutations + outbox + idempotency
/// are committed in a single <see cref="IUnitOfWork.SaveChangesAsync"/> call.
/// Handlers for idempotent commands must NOT call SaveChanges themselves.
/// </summary>
public class IdempotencyBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly IIdempotencyStore _store;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<IdempotencyBehavior<TRequest, TResponse>> _logger;

    public IdempotencyBehavior(
        IIdempotencyStore store,
        IUnitOfWork unitOfWork,
        ILogger<IdempotencyBehavior<TRequest, TResponse>> logger)
    {
        _store = store;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (request is not IIdempotentRequest idempotentRequest)
            return await next();

        var key = idempotentRequest.IdempotencyKey;

        if (!string.IsNullOrWhiteSpace(key))
        {
            var cachedPayload = await _store.GetResponseAsync(key, cancellationToken);
            if (cachedPayload is not null)
            {
                _logger.LogInformation(
                    "Idempotency key {Key} already processed for {RequestType}, returning cached response.",
                    key, typeof(TRequest).Name);

                return JsonSerializer.Deserialize<TResponse>(cachedPayload, JsonOptions)!;
            }
        }

        var response = await next();

        if (!string.IsNullOrWhiteSpace(key))
        {
            var payload = JsonSerializer.Serialize(response, JsonOptions);
            await _store.SaveResponseAsync(key, typeof(TRequest).Name, payload, cancellationToken);
        }

        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex) when (!string.IsNullOrWhiteSpace(key))
        {
            // Concurrent duplicate with the same idempotency key — return the winner's response.
            var winner = await _store.GetResponseAsync(key!, cancellationToken);
            if (winner is not null)
            {
                _logger.LogWarning(ex,
                    "Idempotency race on key {Key} for {RequestType}. Returning stored response.",
                    key, typeof(TRequest).Name);

                return JsonSerializer.Deserialize<TResponse>(winner, JsonOptions)!;
            }

            throw;
        }

        return response;
    }
}
