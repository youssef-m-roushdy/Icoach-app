using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PaymentService.Domain.AggregateRoots;

namespace PaymentService.Infrastructure.Persistence.Configurations;

public class SubscriptionConfiguration : IEntityTypeConfiguration<Subscription>
{
    public void Configure(EntityTypeBuilder<Subscription> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Ignore(s => s.DomainEvents);

        // PostgreSQL system column xmin as optimistic concurrency token.
        builder.Property<uint>("xmin")
            .HasColumnType("xid")
            .ValueGeneratedOnAddOrUpdate()
            .IsConcurrencyToken();

        builder.Property(s => s.UserId).IsRequired();
        builder.Property(s => s.PlanType).HasConversion<string>().HasMaxLength(30);
        builder.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.Gateway).HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(s => s.ExternalSubscriptionId).HasMaxLength(255);
        builder.Property(s => s.ExternalSessionId).HasMaxLength(255);

        builder.HasIndex(s => new { s.UserId, s.CoachId });
        builder.HasIndex(s => s.ExternalSubscriptionId);
        builder.HasIndex(s => s.ExternalSessionId);
    }
}
