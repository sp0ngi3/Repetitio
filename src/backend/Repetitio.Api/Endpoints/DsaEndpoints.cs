using Microsoft.EntityFrameworkCore;
using Repetitio.Application.Dsa;
using Repetitio.Application.Practice;
using Repetitio.Domain.Dsa;
using Repetitio.Domain.LearningItems;
using Repetitio.Domain.Practice;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Api.Endpoints;

/// <summary>
/// Maps DSA tracker API endpoints.
/// </summary>
public static class DsaEndpoints
{
    /// <summary>
    /// Adds DSA endpoints to the application.
    /// </summary>
    /// <param name="app">The endpoint route builder.</param>
    /// <returns>The same endpoint route builder for chaining.</returns>
    public static IEndpointRouteBuilder MapDsaEndpoints(this IEndpointRouteBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);

        var group = app.MapGroup("/api/dsa").WithTags("DSA");

        group.MapGet("/", GetDsaProblemsAsync).WithName("GetDsaProblems");
        group.MapGet("/template", () => Results.Ok(DsaProblemTemplateResponse.Create())).WithName("GetDsaProblemTemplate");
        group.MapGet("/{id:guid}", GetDsaProblemAsync).WithName("GetDsaProblem");
        group.MapPost("/", CreateDsaProblemAsync).WithName("CreateDsaProblem");
        group.MapPut("/{id:guid}", UpdateDsaProblemAsync).WithName("UpdateDsaProblem");
        group.MapDelete("/{id:guid}", DeleteDsaProblemAsync).WithName("DeleteDsaProblem");
        group.MapPost("/{id:guid}/solutions", CreateDsaSolutionAsync).WithName("CreateDsaSolution");

        return app;
    }

    /// <summary>
    /// Returns DSA problems.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="status">The optional status filter.</param>
    /// <param name="difficulty">The optional difficulty filter.</param>
    /// <param name="search">The optional text search.</param>
    /// <returns>The DSA problem responses.</returns>
    private static async Task<IResult> GetDsaProblemsAsync(
        RepetitioDbContext dbContext,
        LearningItemStatus? status,
        LearningDifficulty? difficulty,
        string? search)
    {
        var query = DsaProblemQuery(dbContext).AsQueryable();

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
                || (problem.ProblemStatement != null && problem.ProblemStatement.Contains(normalizedSearch))
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
    /// Returns one DSA problem.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The learning item identifier.</param>
    /// <returns>The DSA problem response when found.</returns>
    private static async Task<IResult> GetDsaProblemAsync(RepetitioDbContext dbContext, Guid id)
    {
        var problem = await DsaProblemQuery(dbContext)
            .FirstOrDefaultAsync(dsaProblem => dsaProblem.LearningItemId == id);

        return problem is null ? Results.NotFound() : Results.Ok(ToResponse(problem));
    }

    /// <summary>
    /// Creates a DSA problem and its underlying learning item.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="request">The create request.</param>
    /// <returns>The created DSA problem response.</returns>
    private static async Task<IResult> CreateDsaProblemAsync(RepetitioDbContext dbContext, CreateDsaProblemRequest request)
    {
        if (!EndpointValidation.HasText(request.Title))
        {
            return Results.BadRequest("Title is required.");
        }

        var now = DateTime.UtcNow;
        var item = new LearningItem
        {
            Id = Guid.NewGuid(),
            Type = LearningItemType.Dsa,
            Title = request.Title.Trim(),
            Description = TrimOptional(request.Description),
            Status = LearningItemStatus.NotStarted,
            Difficulty = request.Difficulty,
            CreatedAt = now,
            UpdatedAt = now
        };

        var problem = new DsaProblem
        {
            LearningItemId = item.Id,
            LearningItem = item,
            Source = TrimOptional(request.Source),
            ExternalUrl = TrimOptional(request.ExternalUrl),
            ProblemStatement = TrimOptional(request.ProblemStatement),
            TestCases = TrimOptional(request.TestCases),
            Assumptions = TrimOptional(request.Assumptions),
            Approach = TrimOptional(request.Approach),
            Notes = TrimOptional(request.Notes),
            WhatHelped = TrimOptional(request.WhatHelped),
            WhatWasDifficult = TrimOptional(request.WhatWasDifficult),
            ImproveNext = TrimOptional(request.ImproveNext),
            KnowledgeChecklist = TrimOptional(request.KnowledgeChecklist),
            QuestionsToAsk = TrimOptional(request.QuestionsToAsk),
            MissedMentalSteps = TrimOptional(request.MissedMentalSteps),
            ExpectedTimeComplexity = TrimOptional(request.ExpectedTimeComplexity),
            ExpectedSpaceComplexity = TrimOptional(request.ExpectedSpaceComplexity),
            CreatedAt = now,
            UpdatedAt = now
        };

        await TagAttachment.AttachTagsAsync(dbContext, item, request.Tags, now);

        dbContext.LearningItems.Add(item);
        dbContext.DsaProblems.Add(problem);
        await dbContext.SaveChangesAsync();

        return Results.Created($"/api/dsa/{item.Id}", ToResponse(problem));
    }

    /// <summary>
    /// Updates a DSA problem and its underlying learning item.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The learning item identifier.</param>
    /// <param name="request">The update request.</param>
    /// <returns>The updated DSA problem response when found.</returns>
    private static async Task<IResult> UpdateDsaProblemAsync(RepetitioDbContext dbContext, Guid id, UpdateDsaProblemRequest request)
    {
        if (!EndpointValidation.HasText(request.Title))
        {
            return Results.BadRequest("Title is required.");
        }

        if (!EndpointValidation.IsValidConfidence(request.Confidence))
        {
            return Results.BadRequest("Confidence must be between 1 and 5.");
        }

        var problem = await DsaProblemQuery(dbContext)
            .AsTracking()
            .FirstOrDefaultAsync(dsaProblem => dsaProblem.LearningItemId == id);

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
        problem.ProblemStatement = TrimOptional(request.ProblemStatement);
        problem.TestCases = TrimOptional(request.TestCases);
        problem.Assumptions = TrimOptional(request.Assumptions);
        problem.Approach = TrimOptional(request.Approach);
        problem.Notes = TrimOptional(request.Notes);
        problem.WhatHelped = TrimOptional(request.WhatHelped);
        problem.WhatWasDifficult = TrimOptional(request.WhatWasDifficult);
        problem.ImproveNext = TrimOptional(request.ImproveNext);
        problem.KnowledgeChecklist = TrimOptional(request.KnowledgeChecklist);
        problem.QuestionsToAsk = TrimOptional(request.QuestionsToAsk);
        problem.MissedMentalSteps = TrimOptional(request.MissedMentalSteps);
        problem.ExpectedTimeComplexity = TrimOptional(request.ExpectedTimeComplexity);
        problem.ExpectedSpaceComplexity = TrimOptional(request.ExpectedSpaceComplexity);
        problem.UpdatedAt = now;

        await TagAttachment.AttachTagsAsync(dbContext, problem.LearningItem, request.Tags, now);
        await dbContext.SaveChangesAsync();

        return Results.Ok(ToResponse(problem));
    }

    /// <summary>
    /// Deletes a DSA problem.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The learning item identifier.</param>
    /// <returns>No content when the problem was deleted.</returns>
    private static async Task<IResult> DeleteDsaProblemAsync(RepetitioDbContext dbContext, Guid id)
    {
        var item = await dbContext.LearningItems
            .FirstOrDefaultAsync(learningItem => learningItem.Id == id && learningItem.Type == LearningItemType.Dsa);

        if (item is null)
        {
            return Results.NotFound();
        }

        dbContext.LearningItems.Remove(item);
        await dbContext.SaveChangesAsync();

        return Results.NoContent();
    }

    /// <summary>
    /// Saves a solution for a DSA problem.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The learning item identifier.</param>
    /// <param name="request">The create solution request.</param>
    /// <returns>The created solution response.</returns>
    private static async Task<IResult> CreateDsaSolutionAsync(
        RepetitioDbContext dbContext,
        Guid id,
        CreateDsaSolutionRequest request)
    {
        if (!EndpointValidation.HasText(request.Language))
        {
            return Results.BadRequest("Language is required.");
        }

        if (!EndpointValidation.HasText(request.SourceCode))
        {
            return Results.BadRequest("Source code is required.");
        }

        var exists = await dbContext.DsaProblems.AnyAsync(problem => problem.LearningItemId == id);

        if (!exists)
        {
            return Results.NotFound();
        }

        var solution = new DsaSolution
        {
            Id = Guid.NewGuid(),
            LearningItemId = id,
            Language = request.Language.Trim(),
            SourceCode = request.SourceCode.Trim(),
            Explanation = TrimOptional(request.Explanation),
            TimeComplexity = TrimOptional(request.TimeComplexity),
            SpaceComplexity = TrimOptional(request.SpaceComplexity),
            CreatedAt = DateTime.UtcNow
        };

        dbContext.DsaSolutions.Add(solution);
        await dbContext.SaveChangesAsync();

        return Results.Created($"/api/dsa/{id}/solutions/{solution.Id}", ToSolutionResponse(solution));
    }

    /// <summary>
    /// Creates the common DSA query with all required navigations.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <returns>The base DSA problem query.</returns>
    private static IQueryable<DsaProblem> DsaProblemQuery(RepetitioDbContext dbContext)
    {
        return dbContext.DsaProblems
            .Include(problem => problem.LearningItem)
            .ThenInclude(item => item.Tags)
            .ThenInclude(itemTag => itemTag.Tag)
            .Include(problem => problem.LearningItem)
            .ThenInclude(item => item.PracticeSessions)
            .Include(problem => problem.Solutions);
    }

    /// <summary>
    /// Converts a DSA problem into an API response.
    /// </summary>
    /// <param name="problem">The DSA problem.</param>
    /// <returns>The DSA problem response.</returns>
    private static DsaProblemResponse ToResponse(DsaProblem problem)
    {
        return new DsaProblemResponse
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
            ProblemStatement = problem.ProblemStatement,
            TestCases = problem.TestCases,
            Assumptions = problem.Assumptions,
            Approach = problem.Approach,
            Notes = problem.Notes,
            WhatHelped = problem.WhatHelped,
            WhatWasDifficult = problem.WhatWasDifficult,
            ImproveNext = problem.ImproveNext,
            KnowledgeChecklist = problem.KnowledgeChecklist,
            QuestionsToAsk = problem.QuestionsToAsk,
            MissedMentalSteps = problem.MissedMentalSteps,
            ExpectedTimeComplexity = problem.ExpectedTimeComplexity,
            ExpectedSpaceComplexity = problem.ExpectedSpaceComplexity,
            Solutions = problem.Solutions.OrderByDescending(solution => solution.CreatedAt).Select(ToSolutionResponse).ToArray(),
            PracticeSessions = problem.LearningItem.PracticeSessions
                .OrderByDescending(session => session.CreatedAt)
                .Select(session => ToPracticeSessionResponse(session, problem.LearningItem.Title))
                .ToArray()
        };
    }

    /// <summary>
    /// Converts a practice session into an API response for a known DSA problem title.
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
    /// Converts a DSA solution into an API response.
    /// </summary>
    /// <param name="solution">The DSA solution.</param>
    /// <returns>The DSA solution response.</returns>
    private static DsaSolutionResponse ToSolutionResponse(DsaSolution solution)
    {
        return new DsaSolutionResponse
        {
            Id = solution.Id,
            Language = solution.Language,
            SourceCode = solution.SourceCode,
            Explanation = solution.Explanation,
            TimeComplexity = solution.TimeComplexity,
            SpaceComplexity = solution.SpaceComplexity,
            CreatedAt = solution.CreatedAt
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
/// Represents the default DSA reflection template returned by the API.
/// </summary>
public sealed record DsaProblemTemplateResponse
{
    /// <summary>
    /// Gets the problem statement template.
    /// </summary>
    public required string ProblemStatement { get; init; }

    /// <summary>
    /// Gets the test cases template.
    /// </summary>
    public required string TestCases { get; init; }

    /// <summary>
    /// Gets the assumptions template.
    /// </summary>
    public required string Assumptions { get; init; }

    /// <summary>
    /// Gets the approach template.
    /// </summary>
    public required string Approach { get; init; }

    /// <summary>
    /// Gets the knowledge checklist template.
    /// </summary>
    public required string KnowledgeChecklist { get; init; }

    /// <summary>
    /// Gets the self-question template.
    /// </summary>
    public required string QuestionsToAsk { get; init; }

    /// <summary>
    /// Gets the missed mental steps template.
    /// </summary>
    public required string MissedMentalSteps { get; init; }

    /// <summary>
    /// Creates the default DSA template response.
    /// </summary>
    /// <returns>The default DSA template response.</returns>
    public static DsaProblemTemplateResponse Create()
    {
        return new DsaProblemTemplateResponse
        {
            ProblemStatement = DsaProblemTemplate.ProblemStatement,
            TestCases = DsaProblemTemplate.TestCases,
            Assumptions = DsaProblemTemplate.Assumptions,
            Approach = DsaProblemTemplate.Approach,
            KnowledgeChecklist = DsaProblemTemplate.KnowledgeChecklist,
            QuestionsToAsk = DsaProblemTemplate.QuestionsToAsk,
            MissedMentalSteps = DsaProblemTemplate.MissedMentalSteps
        };
    }
}
