// Domain/Common/IdempotencyRecord.cs
namespace PaymentService.Domain.Common;

public class IdempotencyRecord
{
    public Guid Id { get; private set; }
    public string Key { get; private set; } = string.Empty;
    public string RequestType { get; private set; } = string.Empty;
    public string ResponsePayload { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }

    private IdempotencyRecord() { }

    public IdempotencyRecord(string key, string requestType, string responsePayload)
    {
        Id = Guid.NewGuid();
        Key = key;
        RequestType = requestType;
        ResponsePayload = responsePayload;
        CreatedAt = DateTime.UtcNow;
    }
}