using Microsoft.EntityFrameworkCore;
using Repetitio.Application.Practice;
using Repetitio.Application.Review;
using Repetitio.Domain.LearningItems;
using Repetitio.Domain.Practice;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Api.Endpoints;

/// <summary>
/// Maps practice session API endpoints.
/// </summary>
public static class PracticeSessionEndpoints
{
    /// <summary>
    /// Adds practice session endpoints to the application.
    /// </summary>
    /// <param name="app">The endpoint route builder.</param>
    /// <returns>The same endpoint route builder for chaining.</returns>
    public static IEndpointRouteBuilder MapPracticeSessionEndpoints(this IEndpointRouteBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);

        var group = app.MapGroup("/api/practice").WithTags("Practice");

        group.MapGet("/", GetPracticeSessionsAsync).WithName("GetPracticeSessions");
        group.MapPost("/", CreatePracticeSessionAsync).WithName("CreatePracticeSession");

        return app;
    }

    /// <summary>
    /// Returns recent practice sessions.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="learningItemId">The optional learning item filter.</param>
    /// <returns>The practice session responses.</returns>
    private static async Task<IResult> GetPracticeSessionsAsync(RepetitioDbContext dbContext, Guid? learningItemId)
    {
        var query = dbContext.PracticeSessions
            .AsNoTracking()
            .Include(session => session.LearningItem)
            .AsQueryable();

        if (learningItemId is not null)
        {
            query = query.Where(session => session.LearningItemId == learningItemId);
        }

        var sessions = await query
            .OrderByDescending(session => session.CreatedAt)
            .Take(50)
            .ToListAsync();

        return Results.Ok(sessions.Select(ApiMappings.ToResponse));
    }

    /// <summary>
    /// Creates a practice session and updates the practiced learning item.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="request">The create request.</param>
    /// <returns>The created practice session response.</returns>
    private static async Task<IResult> CreatePracticeSessionAsync(RepetitioDbContext dbContext, CreatePracticeSessionRequest request)
    {
        if (!EndpointValidation.IsValidConfidence(request.Confidence))
        {
            return Results.BadRequest("Confidence must be between 1 and 5.");
        }

        var learningItem = await dbContext.LearningItems
            .Include(item => item.PracticeSessions)
            .FirstOrDefaultAsync(item => item.Id == request.LearningItemId);

        if (learningItem is null)
        {
            return Results.BadRequest("Learning item does not exist.");
        }

        var now = DateTime.UtcNow;
        var startedAt = request.StartedAt ?? now;
        var completedAt = request.CompletedAt ?? now;
        var durationMs = request.DurationMs ?? Math.Max(0, (long)(completedAt - startedAt).TotalMilliseconds);

        var session = new PracticeSession
        {
            Id = Guid.NewGuid(),
            LearningItemId = learningItem.Id,
            LearningItem = learningItem,
            StartedAt = startedAt,
            CompletedAt = completedAt,
            DurationMs = durationMs,
            Outcome = request.Outcome,
            Confidence = request.Confidence,
            Notes = request.Notes?.Trim(),
            WhatHelped = request.WhatHelped?.Trim(),
            WhatWasDifficult = request.WhatWasDifficult?.Trim(),
            ImproveNext = request.ImproveNext?.Trim(),
            CreatedAt = now
        };

        UpdateLearningItemAfterPractice(learningItem, session, now);

        dbContext.PracticeSessions.Add(session);
        await dbContext.SaveChangesAsync();

        return Results.Created($"/api/practice/{session.Id}", ApiMappings.ToResponse(session));
    }

    /// <summary>
    /// Updates learning item metadata after a practice session.
    /// </summary>
    /// <param name="learningItem">The practiced learning item.</param>
    /// <param name="session">The created practice session.</param>
    /// <param name="updatedAt">The update timestamp.</param>
    private static void UpdateLearningItemAfterPractice(LearningItem learningItem, PracticeSession session, DateTime updatedAt)
    {
        learningItem.LastPracticedAt = session.CompletedAt ?? session.StartedAt;
        learningItem.UpdatedAt = updatedAt;

        if (session.Confidence is not null)
        {
            learningItem.Confidence = session.Confidence;
            learningItem.NextReviewAt = ConfidenceReviewSchedule.CalculateNextReviewAt(
                session.CompletedAt ?? session.StartedAt,
                session.Confidence.Value);
        }

        var successfulAttemptCount = learningItem.PracticeSessions.Count(PracticeProgressPolicy.IsSuccessfulAttempt)
            + (PracticeProgressPolicy.IsSuccessfulAttempt(session) ? 1 : 0);

        learningItem.Status = PracticeProgressPolicy.CalculateStatus(
            learningItem.Status,
            session.Outcome,
            successfulAttemptCount);
    }
}
