using Microsoft.EntityFrameworkCore;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Api.Endpoints;

/// <summary>
/// Maps review queue API endpoints.
/// </summary>
public static class ReviewEndpoints
{
    /// <summary>
    /// Adds review endpoints to the application.
    /// </summary>
    /// <param name="app">The endpoint route builder.</param>
    /// <returns>The same endpoint route builder for chaining.</returns>
    public static IEndpointRouteBuilder MapReviewEndpoints(this IEndpointRouteBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);

        app.MapGet("/api/reviews/due", GetDueReviewsAsync)
            .WithName("GetDueReviews")
            .WithTags("Reviews");

        return app;
    }

    /// <summary>
    /// Returns learning items due for review.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <returns>The due review item responses.</returns>
    private static async Task<IResult> GetDueReviewsAsync(RepetitioDbContext dbContext)
    {
        var now = DateTime.UtcNow;
        var dueItems = await dbContext.LearningItems
            .AsNoTracking()
            .Where(item => item.NextReviewAt != null && item.NextReviewAt <= now)
            .OrderBy(item => item.NextReviewAt)
            .ThenBy(item => item.Title)
            .ToListAsync();

        return Results.Ok(dueItems.Select(ApiMappings.ToDueReviewResponse));
    }
}
