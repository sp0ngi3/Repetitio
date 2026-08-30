using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Repetitio.Infrastructure.Persistence;

/// <summary>
/// Provides design-time database context creation for Entity Framework tools.
/// </summary>
public sealed class RepetitioDbContextFactory : IDesignTimeDbContextFactory<RepetitioDbContext>
{
    /// <summary>
    /// Creates a database context for design-time commands.
    /// </summary>
    /// <param name="args">The command-line arguments.</param>
    /// <returns>A configured database context.</returns>
    public RepetitioDbContext CreateDbContext(string[] args)
    {
        _ = args;

        var options = new DbContextOptionsBuilder<RepetitioDbContext>()
            .UseSqlite("Data Source=data/repetitio.db")
            .Options;

        return new RepetitioDbContext(options);
    }
}
