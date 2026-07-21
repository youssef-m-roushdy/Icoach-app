using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PaymentService.Domain.AggregateRoots;

namespace PaymentService.Infrastructure.Persistence.Configurations;

public class PaymentTransactionConfiguration : IEntityTypeConfiguration<PaymentTransaction>
{
    public void Configure(EntityTypeBuilder<PaymentTransaction> builder)
    {
        builder.HasKey(t => t.Id);
        
        builder.Property(t => t.GatewayTransactionId).IsRequired().HasMaxLength(255);
        builder.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(t => t.RawResponse).IsRequired();

        builder.HasIndex(t => t.GatewayTransactionId);
    }
}