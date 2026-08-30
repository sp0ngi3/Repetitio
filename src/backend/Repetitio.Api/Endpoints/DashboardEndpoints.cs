using Microsoft.EntityFrameworkCore;
using Repetitio.Application.Dashboard;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Api.Endpoints;

/// <summary>
/// Maps dashboard API endpoints.
/// </summary>
public static class DashboardEndpoints
{
    /// <summary>
    /// Adds dashboard endpoints to the application.
    /// </summary>
    /// <param name="app">The endpoint route builder.</param>
    /// <returns>The same endpoint route builder for chaining.</returns>
    public static IEndpointRouteBuilder MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);

        app.MapGet("/api/dashboard", GetDashboardAsync)
            .WithName("GetDashboard")
            .WithTags("Dashboard");

        return app;
    }

    /// <summary>
    /// Returns dashboard metrics and recent practice data.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <returns>The dashboard response.</returns>
    private static async Task<IResult> GetDashboardAsync(RepetitioDbContext dbContext)
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var weekStart = today.AddDays(-6);

        var dueReviews = await dbContext.LearningItems
            .AsNoTracking()
            .Where(item => item.NextReviewAt != null && item.NextReviewAt <= now)
            .OrderBy(item => item.NextReviewAt)
            .ThenBy(item => item.Title)
            .Take(10)
            .ToListAsync();

        var recentPractice = await dbContext.PracticeSessions
            .AsNoTracking()
            .Include(session => session.LearningItem)
            .OrderByDescending(session => session.CreatedAt)
            .Take(10)
            .ToListAsync();

        var response = new DashboardResponse
        {
            PracticesToday = await dbContext.PracticeSessions.CountAsync(session => session.CreatedAt >= today),
            PracticesThisWeek = await dbContext.PracticeSessions.CountAsync(session => session.CreatedAt >= weekStart),
            DueReviewCount = await dbContext.LearningItems.CountAsync(item => item.NextReviewAt != null && item.NextReviewAt <= now),
            NeverPracticedCount = await dbContext.LearningItems.CountAsync(item => item.LastPracticedAt == null),
            DueReviews = dueReviews.Select(ApiMappings.ToDueReviewResponse).ToArray(),
            RecentPractice = recentPractice.Select(ApiMappings.ToResponse).ToArray()
        };

        return Results.Ok(response);
    }
}
