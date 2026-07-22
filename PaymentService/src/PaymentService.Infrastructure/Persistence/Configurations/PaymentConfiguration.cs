using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PaymentService.Domain.AggregateRoots;

namespace PaymentService.Infrastructure.Persistence.Configurations;

public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Ignore(p => p.DomainEvents);

        // PostgreSQL system column xmin as optimistic concurrency token.
        builder.Property<uint>("xmin")
            .HasColumnType("xid")
            .ValueGeneratedOnAddOrUpdate()
            .IsConcurrencyToken();

        builder.Property(p => p.UserId).IsRequired();
        builder.Property(p => p.OrderId).IsRequired().HasMaxLength(100);
        builder.Property(p => p.Amount).HasColumnType("decimal(18,2)");
        builder.Property(p => p.Currency).IsRequired().HasMaxLength(3);

        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Gateway).HasConversion<string>().HasMaxLength(20);

        builder.Property(p => p.ExternalPaymentId).HasMaxLength(255);
        builder.Property(p => p.ExternalSessionId).HasMaxLength(255);
        builder.Property(p => p.CheckoutUrl).HasMaxLength(2048);
        builder.Property(p => p.FailureReason).HasMaxLength(500);

        builder.HasIndex(p => p.UserId);
        builder.HasIndex(p => p.OrderId);
        builder.HasIndex(p => p.ExternalPaymentId);
        builder.HasIndex(p => p.ExternalSessionId);
    }
}
