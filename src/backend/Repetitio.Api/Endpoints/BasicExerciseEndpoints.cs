using Microsoft.EntityFrameworkCore;
using Repetitio.Application.Basics;
using Repetitio.Application.Practice;
using Repetitio.Api.Execution;
using Repetitio.Domain.LearningItems;
using Repetitio.Domain.Practice;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Api.Endpoints;

/// <summary>
/// Maps built-in Basics exercise API endpoints.
/// </summary>
public static class BasicExerciseEndpoints
{
    /// <summary>
    /// Adds Basics exercise endpoints to the application.
    /// </summary>
    /// <param name="app">The endpoint route builder.</param>
    /// <returns>The same endpoint route builder for chaining.</returns>
    public static IEndpointRouteBuilder MapBasicExerciseEndpoints(this IEndpointRouteBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);

        var group = app.MapGroup("/api/basics").WithTags("Basics");

        group.MapGet("/", GetBasicExercisesAsync).WithName("GetBasicExercises");
        group.MapGet("/{slug}", GetBasicExerciseAsync).WithName("GetBasicExercise");
        group.MapPost("/{slug}/execute", ExecuteBasicExerciseAsync).WithName("ExecuteBasicExercise");

        return app;
    }

    /// <summary>
    /// Returns built-in Basics exercises with persisted practice progress.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <returns>The built-in exercise progress responses.</returns>
    private static async Task<IResult> GetBasicExercisesAsync(RepetitioDbContext dbContext)
    {
        await EnsureBasicLearningItemsAsync(dbContext);

        var exercises = BasicExerciseCatalog.GetAll();
        var progressById = await GetBasicProgressByIdAsync(dbContext, exercises);

        return Results.Ok(exercises.Select(exercise => ToProgressResponse(exercise, progressById[GetLearningItemId(exercise)])));
    }

    /// <summary>
    /// Returns one built-in Basics exercise with persisted practice progress.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="slug">The exercise slug.</param>
    /// <returns>The matching exercise when found.</returns>
    private static async Task<IResult> GetBasicExerciseAsync(RepetitioDbContext dbContext, string slug)
    {
        var exercise = BasicExerciseCatalog.GetBySlug(slug);

        if (exercise is null)
        {
            return Results.NotFound();
        }

        await EnsureBasicLearningItemsAsync(dbContext);

        var learningItemId = GetLearningItemId(exercise);
        var item = await BasicLearningItemQuery(dbContext)
            .FirstAsync(learningItem => learningItem.Id == learningItemId);

        return Results.Ok(ToProgressResponse(exercise, item));
    }

    /// <summary>
    /// Compiles and runs a submitted C# solution for one Basics exercise.
    /// </summary>
    /// <param name="slug">The exercise slug.</param>
    /// <param name="request">The execution request.</param>
    /// <param name="executionService">The Basics execution service.</param>
    /// <param name="cancellationToken">The request cancellation token.</param>
    /// <returns>The compilation and automated test result.</returns>
    private static async Task<IResult> ExecuteBasicExerciseAsync(
        string slug,
        ExecuteBasicExerciseRequest request,
        BasicExerciseExecutionService executionService,
        CancellationToken cancellationToken)
    {
        var exercise = BasicExerciseCatalog.GetBySlug(slug);

        if (exercise is null)
        {
            return Results.NotFound();
        }

        var result = await executionService.ExecuteAsync(exercise, request, cancellationToken);
        return Results.Ok(result);
    }

    /// <summary>
    /// Ensures hardcoded Basics exercises exist as non-user-created learning items.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    private static async Task EnsureBasicLearningItemsAsync(RepetitioDbContext dbContext)
    {
        var now = DateTime.UtcNow;

        foreach (var exercise in BasicExerciseCatalog.GetAll())
        {
            var learningItemId = GetLearningItemId(exercise);
            var item = await dbContext.LearningItems
                .Include(learningItem => learningItem.Tags)
                .ThenInclude(itemTag => itemTag.Tag)
                .FirstOrDefaultAsync(learningItem => learningItem.Id == learningItemId);

            if (item is null)
            {
                item = new LearningItem
                {
                    Id = learningItemId,
                    Type = LearningItemType.Basics,
                    Title = exercise.Title,
                    Description = exercise.Instructions,
                    Difficulty = exercise.Difficulty,
                    Status = LearningItemStatus.NotStarted,
                    CreatedAt = now,
                    UpdatedAt = now
                };

                await TagAttachment.AttachTagsAsync(dbContext, item, exercise.Tags, now);
                dbContext.LearningItems.Add(item);
                continue;
            }

            item.Title = exercise.Title;
            item.Description = exercise.Instructions;
            item.Difficulty = exercise.Difficulty;
            item.UpdatedAt = now;

            var currentTags = item.Tags.Select(itemTag => itemTag.Tag.Name).ToHashSet(StringComparer.Ordinal);
            var missingTags = exercise.Tags.Where(tag => !currentTags.Contains(tag)).ToArray();
            await TagAttachment.AttachTagsAsync(dbContext, item, missingTags, now);
        }

        await dbContext.SaveChangesAsync();
    }

    /// <summary>
    /// Returns Basics learning items keyed by their stable identifiers.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="exercises">The built-in exercises to load progress for.</param>
    /// <returns>The loaded Basics learning items keyed by identifier.</returns>
    private static async Task<IReadOnlyDictionary<Guid, LearningItem>> GetBasicProgressByIdAsync(
        RepetitioDbContext dbContext,
        IReadOnlyCollection<BasicExerciseResponse> exercises)
    {
        var ids = exercises.Select(GetLearningItemId).ToArray();
        var items = await BasicLearningItemQuery(dbContext)
            .Where(learningItem => ids.Contains(learningItem.Id))
            .ToListAsync();

        return items.ToDictionary(learningItem => learningItem.Id);
    }

    /// <summary>
    /// Creates the common Basics learning item query with required navigations.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <returns>The base Basics learning item query.</returns>
    private static IQueryable<LearningItem> BasicLearningItemQuery(RepetitioDbContext dbContext)
    {
        return dbContext.LearningItems
            .AsNoTracking()
            .Include(learningItem => learningItem.Tags)
            .ThenInclude(itemTag => itemTag.Tag)
            .Include(learningItem => learningItem.PracticeSessions)
            .Where(learningItem => learningItem.Type == LearningItemType.Basics);
    }

    /// <summary>
    /// Converts a static Basics exercise and its progress item into an API response.
    /// </summary>
    /// <param name="exercise">The static Basics exercise.</param>
    /// <param name="item">The persisted progress learning item.</param>
    /// <returns>The progress response.</returns>
    private static BasicExerciseProgressResponse ToProgressResponse(BasicExerciseResponse exercise, LearningItem item)
    {
        return new BasicExerciseProgressResponse
        {
            Slug = exercise.Slug,
            LearningItemId = item.Id,
            Title = exercise.Title,
            Language = exercise.Language,
            Difficulty = item.Difficulty,
            Instructions = exercise.Instructions,
            ProblemStatement = exercise.ProblemStatement,
            Examples = exercise.Examples,
            Constraints = exercise.Constraints,
            TestCases = exercise.TestCases,
            ApproachGuide = exercise.ApproachGuide,
            StarterCode = exercise.StarterCode,
            FunctionSignature = exercise.FunctionSignature,
            ReferenceSolution = exercise.ReferenceSolution,
            Tags = item.Tags.Select(itemTag => itemTag.Tag.Name).Order(StringComparer.Ordinal).ToArray(),
            Status = item.Status,
            Confidence = item.Confidence,
            LastPracticedAt = item.LastPracticedAt,
            NextReviewAt = item.NextReviewAt,
            TotalAttempts = item.PracticeSessions.Count,
            SuccessfulAttempts = item.PracticeSessions.Count(PracticeProgressPolicy.IsSuccessfulAttempt),
            PracticeSessions = item.PracticeSessions
                .OrderByDescending(session => session.CreatedAt)
                .Select(session => ToPracticeSessionResponse(session, item.Title))
                .ToArray()
        };
    }

    /// <summary>
    /// Converts a practice session into an API response for a known Basics exercise title.
    /// </summary>
    /// <param name="session">The practice session.</param>
    /// <param name="learningItemTitle">The related learning item title.</param>
    /// <returns>The practice session response.</returns>
    private static PracticeSessionResponse ToPracticeSessionResponse(PracticeSession session, string learningItemTitle)
    {
        return new PracticeSessionResponse
        {
            Id = session.Id,
            LearningItemId = session.LearningItemId,
            LearningItemTitle = learningItemTitle,
            StartedAt = session.StartedAt,
            CompletedAt = session.CompletedAt,
            DurationMs = session.DurationMs,
            Outcome = session.Outcome,
            Confidence = session.Confidence,
            ClarifiedRequirements = session.ClarifiedRequirements,
            FoundEdgeCases = session.FoundEdgeCases,
            ExplainedComplexity = session.ExplainedComplexity,
            TestedSolution = session.TestedSolution,
            CommunicatedTradeoffs = session.CommunicatedTradeoffs,
            Approach = session.Approach,
            Prompt = session.Prompt,
            Notes = session.Notes,
            SourceCode = session.SourceCode,
            WhatHelped = session.WhatHelped,
            WhatWasDifficult = session.WhatWasDifficult,
            ImproveNext = session.ImproveNext,
            CreatedAt = session.CreatedAt
        };
    }

    /// <summary>
    /// Gets the deterministic learning item identifier for a Basics exercise.
    /// </summary>
    /// <param name="exercise">The built-in exercise.</param>
    /// <returns>The deterministic learning item identifier.</returns>
    private static Guid GetLearningItemId(BasicExerciseResponse exercise)
    {
        return BasicExerciseIds.CreateLearningItemId(exercise.Slug);
    }
}
