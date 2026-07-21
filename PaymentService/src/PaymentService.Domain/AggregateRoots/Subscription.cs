using PaymentService.Domain.Enums;
using PaymentService.Domain.Events;

namespace PaymentService.Domain.AggregateRoots;

public class Subscription
{
    public Guid Id { get; private set; }
    public int UserId { get; private set; }
    public int? CoachId { get; private set; }
    public SubscriptionPlanType PlanType { get; private set; }
    public SubscriptionStatus Status { get; private set; }
    public GatewayType Gateway { get; private set; }   
    public string? ExternalSubscriptionId { get; private set; }
    public DateTime CurrentPeriodStart { get; private set; }
    public DateTime CurrentPeriodEnd { get; private set; }
    public bool AutoRenew { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? CanceledAt { get; private set; }

    private readonly List<BaseDomainEvent> _domainEvents = new();
    public IReadOnlyCollection<BaseDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    private Subscription() { }

    public Subscription(int userId, SubscriptionPlanType planType, GatewayType gateway, int? coachId = null)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        PlanType = planType;
        Gateway = gateway;                 
        CoachId = coachId;
        Status = SubscriptionStatus.Trialing;
        AutoRenew = true;
        CreatedAt = DateTime.UtcNow;
    }

    public void Activate(string externalSubscriptionId, DateTime periodStart, DateTime periodEnd)
    {
        ExternalSubscriptionId = externalSubscriptionId;
        Status = SubscriptionStatus.Active;
        CurrentPeriodStart = periodStart;
        CurrentPeriodEnd = periodEnd;
        
        _domainEvents.Add(new SubscriptionActivatedEvent(Id, UserId, CoachId, PlanType, periodEnd));
    }

    public void Renew(DateTime periodStart, DateTime periodEnd)
    {
        Status = SubscriptionStatus.Active;
        CurrentPeriodStart = periodStart;
        CurrentPeriodEnd = periodEnd;
        _domainEvents.Add(new SubscriptionRenewedEvent(Id, UserId, periodEnd));
    }

    public void Cancel()
    {
        Status = SubscriptionStatus.Canceled;
        AutoRenew = false;
        CanceledAt = DateTime.UtcNow;
        _domainEvents.Add(new SubscriptionCanceledEvent(Id, UserId));
    }

    public void ClearDomainEvents() => _domainEvents.Clear();
}