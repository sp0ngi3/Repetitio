using Microsoft.EntityFrameworkCore;
using Repetitio.Application.Practice;
using Repetitio.Application.SystemDesign;
using Repetitio.Domain.LearningItems;
using Repetitio.Domain.Practice;
using Repetitio.Domain.SystemDesign;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Api.Endpoints;

/// <summary>
/// Maps System Design tracker API endpoints.
/// </summary>
public static class SystemDesignEndpoints
{
    /// <summary>
    /// Adds System Design endpoints to the application.
    /// </summary>
    /// <param name="app">The endpoint route builder.</param>
    /// <returns>The same endpoint route builder for chaining.</returns>
    public static IEndpointRouteBuilder MapSystemDesignEndpoints(this IEndpointRouteBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);

        var group = app.MapGroup("/api/system-design").WithTags("System Design");

        group.MapGet("/", GetSystemDesignProblemsAsync).WithName("GetSystemDesignProblems");
        group.MapGet("/template", () => Results.Ok(SystemDesignProblemTemplateResponse.Create())).WithName("GetSystemDesignProblemTemplate");
        group.MapGet("/{id:guid}", GetSystemDesignProblemAsync).WithName("GetSystemDesignProblem");
        group.MapPost("/", CreateSystemDesignProblemAsync).WithName("CreateSystemDesignProblem");
        group.MapPut("/{id:guid}", UpdateSystemDesignProblemAsync).WithName("UpdateSystemDesignProblem");
        group.MapDelete("/{id:guid}", DeleteSystemDesignProblemAsync).WithName("DeleteSystemDesignProblem");

        return app;
    }

    /// <summary>
    /// Returns System Design problems.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="status">The optional status filter.</param>
    /// <param name="difficulty">The optional difficulty filter.</param>
    /// <param name="search">The optional text search.</param>
    /// <returns>The System Design problem responses.</returns>
    private static async Task<IResult> GetSystemDesignProblemsAsync(
        RepetitioDbContext dbContext,
        LearningItemStatus? status,
        LearningDifficulty? difficulty,
        string? search)
    {
        await EnsureProblemRowsAsync(dbContext);

        var query = SystemDesignProblemQuery(dbContext).AsQueryable();

        if (status is not null)
        {
            query = query.Where(problem => problem.LearningItem.Status == status);
        }

        if (difficulty is not null)
        {
            query = query.Where(problem => problem.LearningItem.Difficulty == difficulty);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(problem =>
                problem.LearningItem.Title.Contains(normalizedSearch)
                || (problem.Source != null && problem.Source.Contains(normalizedSearch))
                || (problem.PromptMarkdown != null && problem.PromptMarkdown.Contains(normalizedSearch))
                || problem.LearningItem.Tags.Any(itemTag => itemTag.Tag.Name.Contains(normalizedSearch)));
        }

        var problems = await query
            .OrderBy(problem => problem.LearningItem.NextReviewAt == null)
            .ThenBy(problem => problem.LearningItem.NextReviewAt)
            .ThenBy(problem => problem.LearningItem.Title)
            .ToListAsync();

        return Results.Ok(problems.Select(ToResponse));
    }

    /// <summary>
    /// Returns one System Design problem.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The learning item identifier.</param>
    /// <returns>The System Design problem response when found.</returns>
    private static async Task<IResult> GetSystemDesignProblemAsync(RepetitioDbContext dbContext, Guid id)
    {
        await EnsureProblemRowsAsync(dbContext);

        var problem = await SystemDesignProblemQuery(dbContext)
            .FirstOrDefaultAsync(systemDesignProblem => systemDesignProblem.LearningItemId == id);

        return problem is null ? Results.NotFound() : Results.Ok(ToResponse(problem));
    }

    /// <summary>
    /// Creates a System Design problem and its underlying learning item.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="request">The create request.</param>
    /// <returns>The created System Design problem response.</returns>
    private static async Task<IResult> CreateSystemDesignProblemAsync(
        RepetitioDbContext dbContext,
        CreateSystemDesignProblemRequest request)
    {
        if (!EndpointValidation.HasText(request.Title))
        {
            return Results.BadRequest("Title is required.");
        }

        var now = DateTime.UtcNow;
        var item = new LearningItem
        {
            Id = Guid.NewGuid(),
            Type = LearningItemType.SystemDesign,
            Title = request.Title.Trim(),
            Description = TrimOptional(request.Description),
            Status = LearningItemStatus.NotStarted,
            Difficulty = request.Difficulty,
            CreatedAt = now,
            UpdatedAt = now
        };

        var problem = new SystemDesignProblem
        {
            LearningItemId = item.Id,
            LearningItem = item,
            Source = TrimOptional(request.Source),
            ExternalUrl = TrimOptional(request.ExternalUrl),
            PromptMarkdown = TrimOptional(request.PromptMarkdown),
            FunctionalRequirementsMarkdown = TrimOptional(request.FunctionalRequirementsMarkdown),
            NonFunctionalRequirementsMarkdown = TrimOptional(request.NonFunctionalRequirementsMarkdown),
            ConstraintsMarkdown = TrimOptional(request.ConstraintsMarkdown),
            CapacityEstimatesMarkdown = TrimOptional(request.CapacityEstimatesMarkdown),
            ApiDesignMarkdown = TrimOptional(request.ApiDesignMarkdown),
            DataModelMarkdown = TrimOptional(request.DataModelMarkdown),
            ArchitectureMarkdown = TrimOptional(request.ArchitectureMarkdown),
            ScalingStrategyMarkdown = TrimOptional(request.ScalingStrategyMarkdown),
            TradeoffsMarkdown = TrimOptional(request.TradeoffsMarkdown),
            ReflectionMarkdown = TrimOptional(request.ReflectionMarkdown),
            WhatHelped = TrimOptional(request.WhatHelped),
            WhatWasDifficult = TrimOptional(request.WhatWasDifficult),
            ImproveNext = TrimOptional(request.ImproveNext),
            CreatedAt = now,
            UpdatedAt = now
        };

        await TagAttachment.AttachTagsAsync(dbContext, item, request.Tags, now);

        dbContext.LearningItems.Add(item);
        dbContext.SystemDesignProblems.Add(problem);
        await dbContext.SaveChangesAsync();

        return Results.Created($"/api/system-design/{item.Id}", ToResponse(problem));
    }

    /// <summary>
    /// Updates a System Design problem and its underlying learning item.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The learning item identifier.</param>
    /// <param name="request">The update request.</param>
    /// <returns>The updated System Design problem response when found.</returns>
    private static async Task<IResult> UpdateSystemDesignProblemAsync(
        RepetitioDbContext dbContext,
        Guid id,
        UpdateSystemDesignProblemRequest request)
    {
        if (!EndpointValidation.HasText(request.Title))
        {
            return Results.BadRequest("Title is required.");
        }

        if (!EndpointValidation.IsValidConfidence(request.Confidence))
        {
            return Results.BadRequest("Confidence must be between 1 and 5.");
        }

        await EnsureProblemRowsAsync(dbContext);

        var problem = await SystemDesignProblemQuery(dbContext)
            .AsTracking()
            .FirstOrDefaultAsync(systemDesignProblem => systemDesignProblem.LearningItemId == id);

        if (problem is null)
        {
            return Results.NotFound();
        }

        var now = DateTime.UtcNow;
        problem.LearningItem.Title = request.Title.Trim();
        problem.LearningItem.Description = TrimOptional(request.Description);
        problem.LearningItem.Status = request.Status;
        problem.LearningItem.Difficulty = request.Difficulty;
        problem.LearningItem.Confidence = request.Confidence;
        problem.LearningItem.UpdatedAt = now;
        problem.LearningItem.Tags.Clear();

        problem.Source = TrimOptional(request.Source);
        problem.ExternalUrl = TrimOptional(request.ExternalUrl);
        problem.PromptMarkdown = TrimOptional(request.PromptMarkdown);
        problem.FunctionalRequirementsMarkdown = TrimOptional(request.FunctionalRequirementsMarkdown);
        problem.NonFunctionalRequirementsMarkdown = TrimOptional(request.NonFunctionalRequirementsMarkdown);
        problem.ConstraintsMarkdown = TrimOptional(request.ConstraintsMarkdown);
        problem.CapacityEstimatesMarkdown = TrimOptional(request.CapacityEstimatesMarkdown);
        problem.ApiDesignMarkdown = TrimOptional(request.ApiDesignMarkdown);
        problem.DataModelMarkdown = TrimOptional(request.DataModelMarkdown);
        problem.ArchitectureMarkdown = TrimOptional(request.ArchitectureMarkdown);
        problem.ScalingStrategyMarkdown = TrimOptional(request.ScalingStrategyMarkdown);
        problem.TradeoffsMarkdown = TrimOptional(request.TradeoffsMarkdown);
        problem.ReflectionMarkdown = TrimOptional(request.ReflectionMarkdown);
        problem.WhatHelped = TrimOptional(request.WhatHelped);
        problem.WhatWasDifficult = TrimOptional(request.WhatWasDifficult);
        problem.ImproveNext = TrimOptional(request.ImproveNext);
        problem.UpdatedAt = now;

        await TagAttachment.AttachTagsAsync(dbContext, problem.LearningItem, request.Tags, now);
        await dbContext.SaveChangesAsync();

        return Results.Ok(ToResponse(problem));
    }

    /// <summary>
    /// Deletes a System Design problem.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The learning item identifier.</param>
    /// <returns>No content when the problem was deleted.</returns>
    private static async Task<IResult> DeleteSystemDesignProblemAsync(RepetitioDbContext dbContext, Guid id)
    {
        var item = await dbContext.LearningItems
            .FirstOrDefaultAsync(learningItem => learningItem.Id == id && learningItem.Type == LearningItemType.SystemDesign);

        if (item is null)
        {
            return Results.NotFound();
        }

        dbContext.LearningItems.Remove(item);
        await dbContext.SaveChangesAsync();

        return Results.NoContent();
    }

    /// <summary>
    /// Ensures old generic System Design learning items have metadata rows.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    private static async Task EnsureProblemRowsAsync(RepetitioDbContext dbContext)
    {
        var systemDesignItems = await dbContext.LearningItems
            .Where(item => item.Type == LearningItemType.SystemDesign)
            .ToListAsync();

        var existingIds = await dbContext.SystemDesignProblems
            .Select(problem => problem.LearningItemId)
            .ToHashSetAsync();

        var now = DateTime.UtcNow;

        foreach (var item in systemDesignItems.Where(item => !existingIds.Contains(item.Id)))
        {
            dbContext.SystemDesignProblems.Add(new SystemDesignProblem
            {
                LearningItemId = item.Id,
                LearningItem = item,
                PromptMarkdown = item.Description,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        await dbContext.SaveChangesAsync();
    }

    /// <summary>
    /// Creates the common System Design query with all required navigations.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <returns>The base System Design problem query.</returns>
    private static IQueryable<SystemDesignProblem> SystemDesignProblemQuery(RepetitioDbContext dbContext)
    {
        return dbContext.SystemDesignProblems
            .Include(problem => problem.LearningItem)
            .ThenInclude(item => item.Tags)
            .ThenInclude(itemTag => itemTag.Tag)
            .Include(problem => problem.LearningItem)
            .ThenInclude(item => item.PracticeSessions);
    }

    /// <summary>
    /// Converts a System Design problem into an API response.
    /// </summary>
    /// <param name="problem">The System Design problem.</param>
    /// <returns>The System Design problem response.</returns>
    private static SystemDesignProblemResponse ToResponse(SystemDesignProblem problem)
    {
        return new SystemDesignProblemResponse
        {
            Id = problem.LearningItemId,
            Title = problem.LearningItem.Title,
            Description = problem.LearningItem.Description,
            Status = problem.LearningItem.Status,
            Difficulty = problem.LearningItem.Difficulty,
            Confidence = problem.LearningItem.Confidence,
            LastPracticedAt = problem.LearningItem.LastPracticedAt,
            NextReviewAt = problem.LearningItem.NextReviewAt,
            TotalAttempts = problem.LearningItem.PracticeSessions.Count,
            SuccessfulAttempts = problem.LearningItem.PracticeSessions.Count(PracticeProgressPolicy.IsSuccessfulAttempt),
            Source = problem.Source,
            ExternalUrl = problem.ExternalUrl,
            Tags = problem.LearningItem.Tags.Select(itemTag => itemTag.Tag.Name).Order(StringComparer.Ordinal).ToArray(),
            PromptMarkdown = problem.PromptMarkdown,
            FunctionalRequirementsMarkdown = problem.FunctionalRequirementsMarkdown,
            NonFunctionalRequirementsMarkdown = problem.NonFunctionalRequirementsMarkdown,
            ConstraintsMarkdown = problem.ConstraintsMarkdown,
            CapacityEstimatesMarkdown = problem.CapacityEstimatesMarkdown,
            ApiDesignMarkdown = problem.ApiDesignMarkdown,
            DataModelMarkdown = problem.DataModelMarkdown,
            ArchitectureMarkdown = problem.ArchitectureMarkdown,
            ScalingStrategyMarkdown = problem.ScalingStrategyMarkdown,
            TradeoffsMarkdown = problem.TradeoffsMarkdown,
            ReflectionMarkdown = problem.ReflectionMarkdown,
            WhatHelped = problem.WhatHelped,
            WhatWasDifficult = problem.WhatWasDifficult,
            ImproveNext = problem.ImproveNext,
            PracticeSessions = problem.LearningItem.PracticeSessions
                .OrderByDescending(session => session.CreatedAt)
                .Select(session => ToPracticeSessionResponse(session, problem.LearningItem.Title))
                .ToArray()
        };
    }

    /// <summary>
    /// Converts a practice session into an API response for a known System Design problem title.
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
    /// Trims optional text and converts empty strings to null.
    /// </summary>
    /// <param name="value">The text value.</param>
    /// <returns>The trimmed value when present; otherwise, <see langword="null"/>.</returns>
    private static string? TrimOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}

/// <summary>
/// Represents the default System Design markdown template returned by the API.
/// </summary>
public sealed record SystemDesignProblemTemplateResponse
{
    /// <summary>
    /// Gets the default prompt template.
    /// </summary>
    public required string PromptMarkdown { get; init; }

    /// <summary>
    /// Gets the default functional requirements template.
    /// </summary>
    public required string FunctionalRequirementsMarkdown { get; init; }

    /// <summary>
    /// Gets the default non-functional requirements template.
    /// </summary>
    public required string NonFunctionalRequirementsMarkdown { get; init; }

    /// <summary>
    /// Gets the default constraints template.
    /// </summary>
    public required string ConstraintsMarkdown { get; init; }

    /// <summary>
    /// Gets the default reflection template.
    /// </summary>
    public required string ReflectionMarkdown { get; init; }

    /// <summary>
    /// Creates the default System Design template response.
    /// </summary>
    /// <returns>The default System Design template response.</returns>
    public static SystemDesignProblemTemplateResponse Create()
    {
        return new SystemDesignProblemTemplateResponse
        {
            PromptMarkdown = SystemDesignProblemTemplate.PromptMarkdown,
            FunctionalRequirementsMarkdown = SystemDesignProblemTemplate.FunctionalRequirementsMarkdown,
            NonFunctionalRequirementsMarkdown = SystemDesignProblemTemplate.NonFunctionalRequirementsMarkdown,
            ConstraintsMarkdown = SystemDesignProblemTemplate.ConstraintsMarkdown,
            ReflectionMarkdown = SystemDesignProblemTemplate.ReflectionMarkdown
        };
    }
}
