using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PaymentService.Domain.AggregateRoots;
using PaymentService.Domain.Common;
using PaymentService.Domain.Events;
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
        var subscriptionEntries = _context.ChangeTracker
            .Entries<Subscription>()
            .Where(e => e.Entity.DomainEvents.Any())
            .ToList();

        foreach (var entry in subscriptionEntries)
        {
            var eventTypeNames = entry.Entity.DomainEvents
                .Select(e => e.GetType().Name.Replace("Event", string.Empty))
                .ToList();

            var snapshot = new SubscriptionSyncPayload(
                entry.Entity.Id,
                entry.Entity.UserId,
                entry.Entity.CoachId,
                entry.Entity.PlanType.ToString(),
                entry.Entity.Status.ToString(),
                entry.Entity.Gateway.ToString(),
                entry.Entity.CurrentPeriodStart,
                entry.Entity.CurrentPeriodEnd,
                entry.Entity.AutoRenew,
                entry.Entity.CanceledAt
            );

            var payload = JsonSerializer.Serialize(snapshot, JsonOptions);

            foreach (var typeName in eventTypeNames)
            {
                _context.OutboxMessages.Add(new OutboxMessage(typeName, payload));
            }

            entry.Entity.ClearDomainEvents();
        }

        var paymentEntries = _context.ChangeTracker
            .Entries<Payment>()
            .Where(e => e.Entity.DomainEvents.Any())
            .ToList();

        foreach (var entry in paymentEntries)
        {
            var eventTypeNames = entry.Entity.DomainEvents
                .Select(e => e.GetType().Name.Replace("Event", string.Empty))
                .ToList();

            var snapshot = new PaymentSyncPayload(
                entry.Entity.Id,
                entry.Entity.UserId,
                entry.Entity.OrderId,
                entry.Entity.Amount,
                entry.Entity.Currency,
                entry.Entity.Gateway.ToString(),
                entry.Entity.Status.ToString(),
                entry.Entity.ExternalPaymentId,
                entry.Entity.FailureReason
            );

            var payload = JsonSerializer.Serialize(snapshot, JsonOptions);

            foreach (var typeName in eventTypeNames)
            {
                _context.OutboxMessages.Add(new OutboxMessage(typeName, payload));
            }

            entry.Entity.ClearDomainEvents();
        }
    }
}

file sealed record SubscriptionSyncPayload(
    Guid SubscriptionId,
    int UserId,
    int? CoachId,
    string PlanType,
    string Status,
    string Gateway,
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
    string? FailureReason);