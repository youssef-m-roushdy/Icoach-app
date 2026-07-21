// Application/Interfaces/IIdempotentRequest.cs
namespace PaymentService.Application.Interfaces;

public interface IIdempotentRequest
{
    string? IdempotencyKey { get; }
}