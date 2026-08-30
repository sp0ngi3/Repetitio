using Repetitio.Application.Practice;
using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.SystemDesign;

/// <summary>
/// Represents the request payload for creating a System Design problem.
/// </summary>
public record CreateSystemDesignProblemRequest
{
    /// <summary>
    /// Gets the problem title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the optional problem description.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Gets the problem source, such as a course, book, or interview list.
    /// </summary>
    public string? Source { get; init; }

    /// <summary>
    /// Gets the external problem URL.
    /// </summary>
    public string? ExternalUrl { get; init; }

    /// <summary>
    /// Gets the problem difficulty.
    /// </summary>
    public LearningDifficulty Difficulty { get; init; } = LearningDifficulty.Unknown;

    /// <summary>
    /// Gets the tag names that should be assigned to the problem.
    /// </summary>
    public IReadOnlyCollection<string> Tags { get; init; } = [];

    /// <summary>
    /// Gets the markdown prompt or scenario.
    /// </summary>
    public string? PromptMarkdown { get; init; }

    /// <summary>
    /// Gets functional requirements in markdown.
    /// </summary>
    public string? FunctionalRequirementsMarkdown { get; init; }

    /// <summary>
    /// Gets non-functional requirements in markdown.
    /// </summary>
    public string? NonFunctionalRequirementsMarkdown { get; init; }

    /// <summary>
    /// Gets constraints and assumptions in markdown.
    /// </summary>
    public string? ConstraintsMarkdown { get; init; }

    /// <summary>
    /// Gets capacity estimates in markdown.
    /// </summary>
    public string? CapacityEstimatesMarkdown { get; init; }

    /// <summary>
    /// Gets API design notes in markdown.
    /// </summary>
    public string? ApiDesignMarkdown { get; init; }

    /// <summary>
    /// Gets data model notes in markdown.
    /// </summary>
    public string? DataModelMarkdown { get; init; }

    /// <summary>
    /// Gets architecture notes in markdown.
    /// </summary>
    public string? ArchitectureMarkdown { get; init; }

    /// <summary>
    /// Gets scaling strategy notes in markdown.
    /// </summary>
    public string? ScalingStrategyMarkdown { get; init; }

    /// <summary>
    /// Gets tradeoff notes in markdown.
    /// </summary>
    public string? TradeoffsMarkdown { get; init; }

    /// <summary>
    /// Gets reflection notes in markdown.
    /// </summary>
    public string? ReflectionMarkdown { get; init; }

    /// <summary>
    /// Gets what helped solve or explain the design.
    /// </summary>
    public string? WhatHelped { get; init; }

    /// <summary>
    /// Gets what was difficult about the design.
    /// </summary>
    public string? WhatWasDifficult { get; init; }

    /// <summary>
    /// Gets what should be improved on the next attempt.
    /// </summary>
    public string? ImproveNext { get; init; }
}

/// <summary>
/// Represents the request payload for updating a System Design problem.
/// </summary>
public sealed record UpdateSystemDesignProblemRequest : CreateSystemDesignProblemRequest
{
    /// <summary>
    /// Gets the current progress status.
    /// </summary>
    public LearningItemStatus Status { get; init; } = LearningItemStatus.NotStarted;

    /// <summary>
    /// Gets the current confidence value from 1 to 5.
    /// </summary>
    public int? Confidence { get; init; }
}

/// <summary>
/// Represents a System Design problem returned by the API.
/// </summary>
public sealed record SystemDesignProblemResponse
{
    /// <summary>
    /// Gets the related learning item identifier.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the problem title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the optional problem description.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Gets the current progress status.
    /// </summary>
    public required LearningItemStatus Status { get; init; }

    /// <summary>
    /// Gets the problem difficulty.
    /// </summary>
    public required LearningDifficulty Difficulty { get; init; }

    /// <summary>
    /// Gets the current confidence value from 1 to 5.
    /// </summary>
    public int? Confidence { get; init; }

    /// <summary>
    /// Gets the date and time when the problem was last practiced.
    /// </summary>
    public DateTime? LastPracticedAt { get; init; }

    /// <summary>
    /// Gets the next review date and time.
    /// </summary>
    public DateTime? NextReviewAt { get; init; }

    /// <summary>
    /// Gets the number of recorded attempts.
    /// </summary>
    public required int TotalAttempts { get; init; }

    /// <summary>
    /// Gets the number of successful attempts.
    /// </summary>
    public required int SuccessfulAttempts { get; init; }

    /// <summary>
    /// Gets the problem source, such as a course, book, or interview list.
    /// </summary>
    public string? Source { get; init; }

    /// <summary>
    /// Gets the external problem URL.
    /// </summary>
    public string? ExternalUrl { get; init; }

    /// <summary>
    /// Gets the assigned tag names.
    /// </summary>
    public required IReadOnlyCollection<string> Tags { get; init; }

    /// <summary>
    /// Gets the markdown prompt or scenario.
    /// </summary>
    public string? PromptMarkdown { get; init; }

    /// <summary>
    /// Gets functional requirements in markdown.
    /// </summary>
    public string? FunctionalRequirementsMarkdown { get; init; }

    /// <summary>
    /// Gets non-functional requirements in markdown.
    /// </summary>
    public string? NonFunctionalRequirementsMarkdown { get; init; }

    /// <summary>
    /// Gets constraints and assumptions in markdown.
    /// </summary>
    public string? ConstraintsMarkdown { get; init; }

    /// <summary>
    /// Gets capacity estimates in markdown.
    /// </summary>
    public string? CapacityEstimatesMarkdown { get; init; }

    /// <summary>
    /// Gets API design notes in markdown.
    /// </summary>
    public string? ApiDesignMarkdown { get; init; }

    /// <summary>
    /// Gets data model notes in markdown.
    /// </summary>
    public string? DataModelMarkdown { get; init; }

    /// <summary>
    /// Gets architecture notes in markdown.
    /// </summary>
    public string? ArchitectureMarkdown { get; init; }

    /// <summary>
    /// Gets scaling strategy notes in markdown.
    /// </summary>
    public string? ScalingStrategyMarkdown { get; init; }

    /// <summary>
    /// Gets tradeoff notes in markdown.
    /// </summary>
    public string? TradeoffsMarkdown { get; init; }

    /// <summary>
    /// Gets reflection notes in markdown.
    /// </summary>
    public string? ReflectionMarkdown { get; init; }

    /// <summary>
    /// Gets what helped solve or explain the design.
    /// </summary>
    public string? WhatHelped { get; init; }

    /// <summary>
    /// Gets what was difficult about the design.
    /// </summary>
    public string? WhatWasDifficult { get; init; }

    /// <summary>
    /// Gets what should be improved on the next attempt.
    /// </summary>
    public string? ImproveNext { get; init; }

    /// <summary>
    /// Gets recorded practice sessions for the problem.
    /// </summary>
    public required IReadOnlyCollection<PracticeSessionResponse> PracticeSessions { get; init; }
}
