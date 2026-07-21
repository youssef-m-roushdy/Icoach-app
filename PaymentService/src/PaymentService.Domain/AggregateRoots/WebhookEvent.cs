namespace PaymentService.Domain.AggregateRoots;

public class WebhookEvent
{
    public Guid Id { get; private set; }
    public string EventId { get; private set; }
    public string EventType { get; private set; }
    public string Payload { get; private set; }
    public bool Processed { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private WebhookEvent() { }

    public WebhookEvent(string eventId, string eventType, string payload)
    {
        Id = Guid.NewGuid();
        EventId = eventId;
        EventType = eventType;
        Payload = payload;
        Processed = false;
        CreatedAt = DateTime.UtcNow;
    }

    public void MarkAsProcessed()
    {
        Processed = true;
    }
}