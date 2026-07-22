using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PaymentService.Domain.AggregateRoots;
using PaymentService.Domain.Common;
using PaymentService.Domain.Repositories;
using PaymentService.Infrastructure.Persistence;

namespace PaymentService.Infrastructure.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly PaymentDbContext _context;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public UnitOfWork(PaymentDbContext context)
    {
        _context = context;
    }

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken)
    {
        AddOutboxMessagesFromDomainEvents();
        return await _context.SaveChangesAsync(cancellationToken);
    }

    private void AddOutboxMessagesFromDomainEvents()
    {
        ConvertSubscriptionEvents();
        ConvertPaymentEvents();
    }

    private void ConvertSubscriptionEvents()
    {
        var entries = _context.ChangeTracker
            .Entries<Subscription>()
            .Where(e => e.Entity.DomainEvents.Count > 0)
            .ToList();

        foreach (var entry in entries)
        {
            var entity = entry.Entity;
            var snapshot = new SubscriptionSyncPayload(
                entity.Id,
                entity.UserId,
                entity.CoachId,
                entity.PlanType.ToString(),
                entity.Status.ToString(),
                entity.Gateway.ToString(),
                entity.ExternalSubscriptionId,
                entity.CurrentPeriodStart,
                entity.CurrentPeriodEnd,
                entity.AutoRenew,
                entity.CanceledAt);

            var payload = JsonSerializer.Serialize(snapshot, JsonOptions);

            foreach (var domainEvent in entity.DomainEvents)
            {
                var typeName = NormalizeEventTypeName(domainEvent.GetType().Name);
                _context.OutboxMessages.Add(new OutboxMessage(typeName, payload));
            }

            entity.ClearDomainEvents();
        }
    }

    private void ConvertPaymentEvents()
    {
        var entries = _context.ChangeTracker
            .Entries<Payment>()
            .Where(e => e.Entity.DomainEvents.Count > 0)
            .ToList();

        foreach (var entry in entries)
        {
            var entity = entry.Entity;
            var snapshot = new PaymentSyncPayload(
                entity.Id,
                entity.UserId,
                entity.OrderId,
                entity.Amount,
                entity.Currency,
                entity.Gateway.ToString(),
                entity.Status.ToString(),
                entity.ExternalPaymentId,
                entity.ExternalSessionId,
                entity.FailureReason);

            var payload = JsonSerializer.Serialize(snapshot, JsonOptions);

            foreach (var domainEvent in entity.DomainEvents)
            {
                var typeName = NormalizeEventTypeName(domainEvent.GetType().Name);
                _context.OutboxMessages.Add(new OutboxMessage(typeName, payload));
            }

            entity.ClearDomainEvents();
        }
    }

    private static string NormalizeEventTypeName(string eventTypeName)
        => eventTypeName.EndsWith("Event", StringComparison.Ordinal)
            ? eventTypeName[..^5]
            : eventTypeName;
}

file sealed record SubscriptionSyncPayload(
    Guid SubscriptionId,
    int UserId,
    int? CoachId,
    string PlanType,
    string Status,
    string Gateway,
    string? ExternalSubscriptionId,
    DateTime CurrentPeriodStart,
    DateTime CurrentPeriodEnd,
    bool AutoRenew,
    DateTime? CanceledAt);

file sealed record PaymentSyncPayload(
    Guid PaymentId,
    int UserId,
    string OrderId,
    decimal Amount,
    string Currency,
    string Gateway,
    string Status,
    string? ExternalPaymentId,
    string? ExternalSessionId,
    string? FailureReason);
