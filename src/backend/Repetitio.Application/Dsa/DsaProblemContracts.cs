using Repetitio.Application.Practice;
using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.Dsa;

/// <summary>
/// Represents the request payload for creating a DSA problem.
/// </summary>
public record CreateDsaProblemRequest
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
    /// Gets the problem source, such as LeetCode or a book.
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
    /// Gets the problem statement or prompt.
    /// </summary>
    public string? ProblemStatement { get; init; }

    /// <summary>
    /// Gets the test cases captured by the user.
    /// </summary>
    public string? TestCases { get; init; }

    /// <summary>
    /// Gets the assumptions made before solving.
    /// </summary>
    public string? Assumptions { get; init; }

    /// <summary>
    /// Gets the chosen solving approach.
    /// </summary>
    public string? Approach { get; init; }

    /// <summary>
    /// Gets free-form personal notes.
    /// </summary>
    public string? Notes { get; init; }

    /// <summary>
    /// Gets what helped solve the problem.
    /// </summary>
    public string? WhatHelped { get; init; }

    /// <summary>
    /// Gets what was difficult about the problem.
    /// </summary>
    public string? WhatWasDifficult { get; init; }

    /// <summary>
    /// Gets what should be improved on the next attempt.
    /// </summary>
    public string? ImproveNext { get; init; }

    /// <summary>
    /// Gets what should be known after solving the problem.
    /// </summary>
    public string? KnowledgeChecklist { get; init; }

    /// <summary>
    /// Gets questions the user should have asked while solving.
    /// </summary>
    public string? QuestionsToAsk { get; init; }

    /// <summary>
    /// Gets missed mental steps from the solving process.
    /// </summary>
    public string? MissedMentalSteps { get; init; }

    /// <summary>
    /// Gets the expected time complexity.
    /// </summary>
    public string? ExpectedTimeComplexity { get; init; }

    /// <summary>
    /// Gets the expected space complexity.
    /// </summary>
    public string? ExpectedSpaceComplexity { get; init; }
}

/// <summary>
/// Represents the request payload for updating a DSA problem.
/// </summary>
public sealed record UpdateDsaProblemRequest : CreateDsaProblemRequest
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
/// Represents a DSA problem returned by the API.
/// </summary>
public sealed record DsaProblemResponse
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
    /// Gets the problem source, such as LeetCode or a book.
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
    /// Gets the problem statement or prompt.
    /// </summary>
    public string? ProblemStatement { get; init; }

    /// <summary>
    /// Gets the test cases captured by the user.
    /// </summary>
    public string? TestCases { get; init; }

    /// <summary>
    /// Gets the assumptions made before solving.
    /// </summary>
    public string? Assumptions { get; init; }

    /// <summary>
    /// Gets the chosen solving approach.
    /// </summary>
    public string? Approach { get; init; }

    /// <summary>
    /// Gets free-form personal notes.
    /// </summary>
    public string? Notes { get; init; }

    /// <summary>
    /// Gets what helped solve the problem.
    /// </summary>
    public string? WhatHelped { get; init; }

    /// <summary>
    /// Gets what was difficult about the problem.
    /// </summary>
    public string? WhatWasDifficult { get; init; }

    /// <summary>
    /// Gets what should be improved on the next attempt.
    /// </summary>
    public string? ImproveNext { get; init; }

    /// <summary>
    /// Gets what should be known after solving the problem.
    /// </summary>
    public string? KnowledgeChecklist { get; init; }

    /// <summary>
    /// Gets questions the user should have asked while solving.
    /// </summary>
    public string? QuestionsToAsk { get; init; }

    /// <summary>
    /// Gets missed mental steps from the solving process.
    /// </summary>
    public string? MissedMentalSteps { get; init; }

    /// <summary>
    /// Gets the expected time complexity.
    /// </summary>
    public string? ExpectedTimeComplexity { get; init; }

    /// <summary>
    /// Gets the expected space complexity.
    /// </summary>
    public string? ExpectedSpaceComplexity { get; init; }

    /// <summary>
    /// Gets saved solutions for the problem.
    /// </summary>
    public required IReadOnlyCollection<DsaSolutionResponse> Solutions { get; init; }

    /// <summary>
    /// Gets recorded practice sessions for the problem.
    /// </summary>
    public required IReadOnlyCollection<PracticeSessionResponse> PracticeSessions { get; init; }
}
