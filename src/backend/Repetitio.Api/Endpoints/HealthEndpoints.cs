using Microsoft.EntityFrameworkCore;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Api.Endpoints;

/// <summary>
/// Maps health-related API endpoints.
/// </summary>
public static class HealthEndpoints
{
    /// <summary>
    /// Adds the health endpoint to the application.
    /// </summary>
    /// <param name="app">The endpoint route builder.</param>
    /// <returns>The same endpoint route builder for chaining.</returns>
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);

        app.MapGet("/api/health", GetHealthAsync)
            .WithName("GetHealth")
            .WithTags("Health");

        return app;
    }

    /// <summary>
    /// Checks whether the API and database are reachable.
    /// </summary>
    /// <param name="dbContext">The Repetitio database context.</param>
    /// <param name="cancellationToken">Token used to cancel the check.</param>
    /// <returns>A health response with database connectivity status.</returns>
    private static async Task<IResult> GetHealthAsync(RepetitioDbContext dbContext, CancellationToken cancellationToken)
    {
        var databaseConnected = false;

        try
        {
            databaseConnected = await dbContext.Database.CanConnectAsync(cancellationToken);
        }
        catch
        {
            databaseConnected = false;
        }

        var response = new HealthResponse(databaseConnected ? "ok" : "degraded", DateTime.UtcNow, databaseConnected);

        return databaseConnected
            ? Results.Ok(response)
            : Results.Json(response, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
}

/// <summary>
/// Represents the API health response.
/// </summary>
public sealed record HealthResponse
{
    /// <summary>
    /// Initializes a new instance of the <see cref="HealthResponse"/> record.
    /// </summary>
    /// <param name="status">The service status.</param>
    /// <param name="checkedAt">The UTC date and time when the health check was created.</param>
    /// <param name="databaseConnected">A value indicating whether the database connection can be opened.</param>
    public HealthResponse(string status, DateTime checkedAt, bool databaseConnected)
    {
        Status = status;
        CheckedAt = checkedAt;
        DatabaseConnected = databaseConnected;
    }

    /// <summary>
    /// Gets the service status.
    /// </summary>
    public string Status { get; }

    /// <summary>
    /// Gets the date and time when the health check was created.
    /// </summary>
    public DateTime CheckedAt { get; }

    /// <summary>
    /// Gets a value indicating whether the database connection can be opened.
    /// </summary>
    public bool DatabaseConnected { get; }
}
