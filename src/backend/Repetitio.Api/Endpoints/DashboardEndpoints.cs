using Microsoft.EntityFrameworkCore;
using Repetitio.Application.Dashboard;
using Repetitio.Domain.LearningItems;
using Repetitio.Domain.Practice;
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

        var learningItems = await dbContext.LearningItems
            .AsNoTracking()
            .Include(item => item.Tags)
            .ThenInclude(itemTag => itemTag.Tag)
            .Include(item => item.PracticeSessions)
            .ToListAsync();

        var response = new DashboardResponse
        {
            PracticesToday = await dbContext.PracticeSessions.CountAsync(session => session.CreatedAt >= today),
            PracticesThisWeek = await dbContext.PracticeSessions.CountAsync(session => session.CreatedAt >= weekStart),
            DueReviewCount = await dbContext.LearningItems.CountAsync(item => item.NextReviewAt != null && item.NextReviewAt <= now),
            NeverPracticedCount = await dbContext.LearningItems.CountAsync(item => item.LastPracticedAt == null),
            DueReviews = dueReviews.Select(ApiMappings.ToDueReviewResponse).ToArray(),
            InterviewPlan = CreateInterviewPlan(learningItems, now),
            WeaknessMap = CreateWeaknessMap(learningItems),
            RecentPractice = recentPractice.Select(ApiMappings.ToResponse).ToArray()
        };

        return Results.Ok(response);
    }

    /// <summary>
    /// Creates a compact daily plan from due, untouched, weak, and stale items.
    /// </summary>
    /// <param name="items">Learning items to score.</param>
    /// <param name="now">The current timestamp.</param>
    /// <returns>Prioritized daily interview plan items.</returns>
    private static IReadOnlyCollection<InterviewPlanItemResponse> CreateInterviewPlan(
        IEnumerable<LearningItem> items,
        DateTime now)
    {
        return items
            .Select(item => new
            {
                Item = item,
                Score = CalculatePlanScore(item, now),
                Reason = CreatePlanReason(item, now)
            })
            .Where(candidate => candidate.Score > 0)
            .OrderByDescending(candidate => candidate.Score)
            .ThenBy(candidate => candidate.Item.LastPracticedAt ?? DateTime.MinValue)
            .ThenBy(candidate => candidate.Item.Title)
            .Take(5)
            .Select(candidate => new InterviewPlanItemResponse
            {
                Id = candidate.Item.Id,
                Title = candidate.Item.Title,
                Type = candidate.Item.Type,
                Tags = candidate.Item.Tags.Select(itemTag => itemTag.Tag.Name).Order(StringComparer.Ordinal).ToArray(),
                Reason = candidate.Reason,
                LastPracticedAt = candidate.Item.LastPracticedAt,
                NextReviewAt = candidate.Item.NextReviewAt,
                Confidence = candidate.Item.Confidence,
                TotalAttempts = candidate.Item.PracticeSessions.Count
            })
            .ToArray();
    }

    /// <summary>
    /// Creates weakness summaries grouped by learning tag.
    /// </summary>
    /// <param name="items">Learning items to summarize.</param>
    /// <returns>Tag-level weakness summaries.</returns>
    private static IReadOnlyCollection<WeaknessTagResponse> CreateWeaknessMap(IEnumerable<LearningItem> items)
    {
        return items
            .SelectMany(item => item.Tags.Select(itemTag => new { Tag = itemTag.Tag.Name, Item = item }))
            .GroupBy(entry => entry.Tag, StringComparer.Ordinal)
            .Select(group =>
            {
                var groupedItems = group.Select(entry => entry.Item).DistinctBy(item => item.Id).ToArray();
                var confidenceValues = groupedItems
                    .Where(item => item.Confidence is not null)
                    .Select(item => item.Confidence!.Value)
                    .ToArray();
                var failedOrPartial = groupedItems
                    .SelectMany(item => item.PracticeSessions)
                    .Count(session => session.Outcome is PracticeOutcome.Failed or PracticeOutcome.Partial);

                return new WeaknessTagResponse
                {
                    Tag = group.Key,
                    ItemCount = groupedItems.Length,
                    AverageConfidence = confidenceValues.Length == 0 ? null : Math.Round(confidenceValues.Average(), 1),
                    FailedOrPartialAttempts = failedOrPartial,
                    LastPracticedAt = groupedItems.Max(item => item.LastPracticedAt),
                    ImproveNextSamples = groupedItems
                        .SelectMany(item => item.PracticeSessions)
                        .OrderByDescending(session => session.CreatedAt)
                        .Select(session => session.ImproveNext?.Trim())
                        .Where(note => !string.IsNullOrWhiteSpace(note))
                        .Distinct(StringComparer.Ordinal)
                        .Take(2)
                        .Cast<string>()
                        .ToArray()
                };
            })
            .Where(summary => summary.FailedOrPartialAttempts > 0 || summary.AverageConfidence is null or < 4)
            .OrderByDescending(summary => summary.FailedOrPartialAttempts)
            .ThenBy(summary => summary.AverageConfidence ?? 0)
            .ThenBy(summary => summary.LastPracticedAt ?? DateTime.MinValue)
            .Take(8)
            .ToArray();
    }

    /// <summary>
    /// Scores a learning item for today's recommended practice list.
    /// </summary>
    /// <param name="item">The learning item.</param>
    /// <param name="now">The current timestamp.</param>
    /// <returns>A higher score for more urgent items.</returns>
    private static int CalculatePlanScore(LearningItem item, DateTime now)
    {
        var score = 0;

        if (item.NextReviewAt is not null && item.NextReviewAt <= now)
        {
            score += 100;
        }

        if (item.LastPracticedAt is null)
        {
            score += 80;
        }
        else if (item.LastPracticedAt <= now.AddDays(-21))
        {
            score += 35;
        }

        if (item.Confidence is null)
        {
            score += 20;
        }
        else if (item.Confidence <= 2)
        {
            score += 45;
        }
        else if (item.Confidence == 3)
        {
            score += 20;
        }

        return score;
    }

    /// <summary>
    /// Creates a human-readable reason for why an item is in today's plan.
    /// </summary>
    /// <param name="item">The learning item.</param>
    /// <param name="now">The current timestamp.</param>
    /// <returns>A short reason string.</returns>
    private static string CreatePlanReason(LearningItem item, DateTime now)
    {
        if (item.NextReviewAt is not null && item.NextReviewAt <= now)
        {
            return "Due review";
        }

        if (item.LastPracticedAt is null)
        {
            return "Never practiced";
        }

        if (item.Confidence is <= 2)
        {
            return "Low confidence";
        }

        if (item.LastPracticedAt <= now.AddDays(-21))
        {
            return "Stale practice";
        }

        return "Needs calibration";
    }
}
