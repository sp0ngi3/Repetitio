using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Repetitio.Infrastructure.Backup;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Infrastructure;

/// <summary>
/// Registers infrastructure services.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Adds Repetitio infrastructure dependencies to the service collection.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The application configuration.</param>
    /// <returns>The same service collection for chaining.</returns>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        var connectionString = configuration.GetConnectionString("Repetitio")
            ?? "Data Source=../../../../data/repetitio.db";

        services.AddDbContext<RepetitioDbContext>(options =>
            options.UseSqlite(
                connectionString,
                sqliteOptions => sqliteOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)));
        services.Configure<BackupOptions>(options =>
        {
            options.Directory = configuration["Backup:Directory"] ?? options.Directory;
        });
        services.AddSingleton<BackupArchiveValidator>();
        services.AddScoped<IRepetitioBackupService, RepetitioBackupService>();

        return services;
    }
}
