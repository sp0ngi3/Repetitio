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

        app.MapGet("/api/health", () => Results.Ok(new HealthResponse("ok", DateTime.UtcNow)))
            .WithName("GetHealth")
            .WithTags("Health");

        return app;
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
    public HealthResponse(string status, DateTime checkedAt)
    {
        Status = status;
        CheckedAt = checkedAt;
    }

    /// <summary>
    /// Gets the service status.
    /// </summary>
    public string Status { get; }

    /// <summary>
    /// Gets the date and time when the health check was created.
    /// </summary>
    public DateTime CheckedAt { get; }
}
