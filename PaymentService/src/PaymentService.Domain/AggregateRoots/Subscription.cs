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
    public string? ExternalSessionId { get; private set; }
    public string? ExternalSubscriptionId { get; private set; }
    public DateTime CurrentPeriodStart { get; private set; }
    public DateTime CurrentPeriodEnd { get; private set; }
    public bool AutoRenew { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
    public DateTime? CanceledAt { get; private set; }

    private readonly List<BaseDomainEvent> _domainEvents = new();
    public IReadOnlyCollection<BaseDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    private Subscription() { }

    public Subscription(int userId, SubscriptionPlanType planType, GatewayType gateway, int? coachId = null)
    {
        if (userId <= 0) throw new ArgumentOutOfRangeException(nameof(userId));

        Id = Guid.NewGuid();
        UserId = userId;
        PlanType = planType;
        Gateway = gateway;
        CoachId = coachId;
        Status = SubscriptionStatus.Trialing;
        AutoRenew = true;
        CreatedAt = DateTime.UtcNow;
    }

    public void SetExternalSessionId(string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
            throw new ArgumentException("Session id is required.", nameof(sessionId));

        ExternalSessionId = sessionId;
        Touch();
    }

    public void Activate(string externalSubscriptionId, DateTime periodStart, DateTime periodEnd)
    {
        if (string.IsNullOrWhiteSpace(externalSubscriptionId))
            throw new ArgumentException("External subscription id is required.", nameof(externalSubscriptionId));

        ValidatePeriod(periodStart, periodEnd);

        if (Status == SubscriptionStatus.Active)
        {
            // Idempotent duplicate activate / period sync.
            if (string.Equals(ExternalSubscriptionId, externalSubscriptionId, StringComparison.Ordinal)
                && CurrentPeriodStart == periodStart
                && CurrentPeriodEnd == periodEnd)
            {
                return;
            }

            Renew(periodStart, periodEnd);
            return;
        }

        if (Status is not (SubscriptionStatus.Trialing or SubscriptionStatus.Canceled or SubscriptionStatus.Expired or SubscriptionStatus.PastDue))
            throw new InvalidOperationException($"Cannot activate subscription from {Status}");

        ExternalSubscriptionId = externalSubscriptionId;
        Status = SubscriptionStatus.Active;
        CurrentPeriodStart = periodStart;
        CurrentPeriodEnd = periodEnd;
        AutoRenew = true;
        CanceledAt = null;
        Touch();

        Raise(new SubscriptionActivatedEvent(Id, UserId, CoachId, PlanType, periodEnd));
    }

    public void Renew(DateTime periodStart, DateTime periodEnd)
    {
        ValidatePeriod(periodStart, periodEnd);

        if (Status is SubscriptionStatus.Canceled or SubscriptionStatus.Expired)
            throw new InvalidOperationException($"Cannot renew subscription from {Status}");

        if (Status is not (SubscriptionStatus.Active or SubscriptionStatus.Trialing or SubscriptionStatus.PastDue))
            throw new InvalidOperationException($"Cannot renew subscription from {Status}");

        if (Status == SubscriptionStatus.Active
            && CurrentPeriodStart == periodStart
            && CurrentPeriodEnd == periodEnd)
        {
            return;
        }

        Status = SubscriptionStatus.Active;
        CurrentPeriodStart = periodStart;
        CurrentPeriodEnd = periodEnd;
        Touch();

        Raise(new SubscriptionRenewedEvent(Id, UserId, periodEnd));
    }

    public void Cancel()
    {
        if (Status == SubscriptionStatus.Canceled) return;

        if (Status is not (SubscriptionStatus.Active or SubscriptionStatus.Trialing or SubscriptionStatus.PastDue))
            throw new InvalidOperationException($"Cannot cancel subscription from {Status}");

        Status = SubscriptionStatus.Canceled;
        AutoRenew = false;
        CanceledAt = DateTime.UtcNow;
        Touch();

        Raise(new SubscriptionCanceledEvent(Id, UserId));
    }

    public void MarkAsPastDue()
    {
        if (Status == SubscriptionStatus.PastDue) return;

        if (Status is SubscriptionStatus.Canceled or SubscriptionStatus.Expired) return;

        if (Status is not (SubscriptionStatus.Active or SubscriptionStatus.Trialing))
            throw new InvalidOperationException($"Cannot mark PastDue from {Status}");

        Status = SubscriptionStatus.PastDue;
        Touch();

        Raise(new SubscriptionPastDueEvent(Id, UserId));
    }

    /// <summary>Legacy alias kept for existing call sites.</summary>
    public void HandlePaymentFailed() => MarkAsPastDue();

    public void Expire()
    {
        if (Status == SubscriptionStatus.Expired) return;

        if (Status == SubscriptionStatus.Canceled) return;

        if (Status is not (SubscriptionStatus.Active or SubscriptionStatus.Trialing or SubscriptionStatus.PastDue))
            throw new InvalidOperationException($"Cannot expire subscription from {Status}");

        Status = SubscriptionStatus.Expired;
        AutoRenew = false;
        Touch();

        Raise(new SubscriptionExpiredEvent(Id, UserId));
    }

    public void DisableAutoRenew()
    {
        if (!AutoRenew) return;
        AutoRenew = false;
        Touch();
    }

    public void ClearDomainEvents() => _domainEvents.Clear();

    private void Raise(BaseDomainEvent domainEvent)
    {
        if (_domainEvents.Exists(e => e.GetType() == domainEvent.GetType()))
            return;

        _domainEvents.Add(domainEvent);
    }

    private void Touch() => UpdatedAt = DateTime.UtcNow;

    private static void ValidatePeriod(DateTime periodStart, DateTime periodEnd)
    {
        if (periodEnd <= periodStart)
            throw new ArgumentException("Period end must be after period start.");
    }
}
