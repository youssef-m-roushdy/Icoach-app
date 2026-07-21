// Application/Interfaces/IIdempotencyStore.cs
namespace PaymentService.Application.Interfaces;

public interface IIdempotencyStore
{
    Task<string?> GetResponseAsync(string key, CancellationToken ct);
    Task SaveResponseAsync(string key, string requestType, string responsePayload, CancellationToken ct);
}