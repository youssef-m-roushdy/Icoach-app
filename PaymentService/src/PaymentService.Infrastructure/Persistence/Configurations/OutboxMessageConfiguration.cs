using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PaymentService.Domain.Common;

namespace PaymentService.Infrastructure.Persistence.Configurations;

public class OutboxMessageConfiguration : IEntityTypeConfiguration<OutboxMessage>
{
    public void Configure(EntityTypeBuilder<OutboxMessage> builder)
    {
        builder.HasKey(o => o.Id);

        builder.Property(o => o.Type).IsRequired().HasMaxLength(100);
        builder.Property(o => o.Payload).IsRequired().HasColumnType("text");
        builder.Property(o => o.LastError).HasMaxLength(1000);

        builder.HasIndex(o => new { o.ProcessedAt, o.OccurredAt });
    }
}