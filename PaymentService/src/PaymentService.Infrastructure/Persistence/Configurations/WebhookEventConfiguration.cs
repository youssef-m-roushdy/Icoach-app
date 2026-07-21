using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PaymentService.Domain.AggregateRoots;

namespace PaymentService.Infrastructure.Persistence.Configurations;

public class WebhookEventConfiguration : IEntityTypeConfiguration<WebhookEvent>
{
    public void Configure(EntityTypeBuilder<WebhookEvent> builder)
    {
        builder.HasKey(w => w.Id);
        
        builder.Property(w => w.EventId).IsRequired().HasMaxLength(100);
        builder.Property(w => w.EventType).IsRequired().HasMaxLength(100);
        builder.Property(w => w.Payload).IsRequired();

        builder.HasIndex(w => w.EventId).IsUnique();
    }
}