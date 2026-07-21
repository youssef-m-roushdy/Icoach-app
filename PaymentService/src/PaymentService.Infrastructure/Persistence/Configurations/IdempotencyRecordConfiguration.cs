// Infrastructure/Persistence/Configurations/IdempotencyRecordConfiguration.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PaymentService.Domain.Common;

namespace PaymentService.Infrastructure.Persistence.Configurations;

public class IdempotencyRecordConfiguration : IEntityTypeConfiguration<IdempotencyRecord>
{
    public void Configure(EntityTypeBuilder<IdempotencyRecord> builder)
    {
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Key).IsRequired().HasMaxLength(200);
        builder.Property(r => r.RequestType).IsRequired().HasMaxLength(200);
        builder.Property(r => r.ResponsePayload).IsRequired().HasColumnType("text");

        // The unique constraint is the real safety net against race conditions —
        // two concurrent requests with the same key can't both succeed at insert time.
        builder.HasIndex(r => r.Key).IsUnique();
    }
}