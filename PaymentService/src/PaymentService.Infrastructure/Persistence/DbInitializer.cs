using Microsoft.EntityFrameworkCore;

namespace PaymentService.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task InitializeAsync(PaymentDbContext context)
    {
        await context.Database.MigrateAsync();
    }
}