using Repetitio.Domain.LearningItems;

namespace Repetitio.Domain.Dsa;

/// <summary>
/// Represents DSA-specific metadata for a user-created learning item.
/// </summary>
public sealed class DsaProblem
{
    /// <summary>
    /// Gets or sets the related learning item identifier.
    /// </summary>
    public Guid LearningItemId { get; set; }

    /// <summary>
    /// Gets or sets the related learning item.
    /// </summary>
    public LearningItem LearningItem { get; set; } = null!;

    /// <summary>
    /// Gets or sets the problem source, such as LeetCode or a book.
    /// </summary>
    public string? Source { get; set; }

    /// <summary>
    /// Gets or sets the external problem URL.
    /// </summary>
    public string? ExternalUrl { get; set; }

    /// <summary>
    /// Gets or sets the problem statement or prompt.
    /// </summary>
    public string? ProblemStatement { get; set; }

    /// <summary>
    /// Gets or sets the test cases captured by the user.
    /// </summary>
    public string? TestCases { get; set; }

    /// <summary>
    /// Gets or sets the assumptions made before solving.
    /// </summary>
    public string? Assumptions { get; set; }

    /// <summary>
    /// Gets or sets the chosen solving approach.
    /// </summary>
    public string? Approach { get; set; }

    /// <summary>
    /// Gets or sets free-form personal notes.
    /// </summary>
    public string? Notes { get; set; }

    /// <summary>
    /// Gets or sets what helped solve the problem.
    /// </summary>
    public string? WhatHelped { get; set; }

    /// <summary>
    /// Gets or sets what was difficult about the problem.
    /// </summary>
    public string? WhatWasDifficult { get; set; }

    /// <summary>
    /// Gets or sets what should be improved on the next attempt.
    /// </summary>
    public string? ImproveNext { get; set; }

    /// <summary>
    /// Gets or sets what should be known after solving the problem.
    /// </summary>
    public string? KnowledgeChecklist { get; set; }

    /// <summary>
    /// Gets or sets questions the user should have asked while solving.
    /// </summary>
    public string? QuestionsToAsk { get; set; }

    /// <summary>
    /// Gets or sets missed mental steps from the solving process.
    /// </summary>
    public string? MissedMentalSteps { get; set; }

    /// <summary>
    /// Gets or sets the expected time complexity.
    /// </summary>
    public string? ExpectedTimeComplexity { get; set; }

    /// <summary>
    /// Gets or sets the expected space complexity.
    /// </summary>
    public string? ExpectedSpaceComplexity { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the DSA metadata was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the DSA metadata was last updated.
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Gets the saved solutions for this DSA problem.
    /// </summary>
    public ICollection<DsaSolution> Solutions { get; } = new List<DsaSolution>();
}
