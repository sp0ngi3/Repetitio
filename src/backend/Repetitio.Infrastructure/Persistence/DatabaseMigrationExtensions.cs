using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Repetitio.Infrastructure.Persistence;

/// <summary>
/// Provides database migration helpers for application startup.
/// </summary>
public static class DatabaseMigrationExtensions
{
    /// <summary>
    /// Applies pending Entity Framework migrations.
    /// </summary>
    /// <param name="services">The service provider.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public static async Task ApplyDatabaseMigrationsAsync(this IServiceProvider services)
    {
        ArgumentNullException.ThrowIfNull(services);

        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<RepetitioDbContext>();
        EnsureSqliteDirectoryExists(dbContext);
        await dbContext.Database.MigrateAsync();
    }

    /// <summary>
    /// Creates the SQLite database directory when the configured data source is file-based.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    private static void EnsureSqliteDirectoryExists(RepetitioDbContext dbContext)
    {
        var connectionString = dbContext.Database.GetConnectionString();

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return;
        }

        var builder = new SqliteConnectionStringBuilder(connectionString);
        var dataSource = builder.DataSource;

        if (string.IsNullOrWhiteSpace(dataSource) || dataSource.Equals(":memory:", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var directory = Path.GetDirectoryName(Path.GetFullPath(dataSource));

        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }
    }
}
