using Repetitio.Domain.LearningItems;

namespace Repetitio.Domain.SystemDesign;

/// <summary>
/// Represents System Design-specific metadata for a user-created learning item.
/// </summary>
public sealed class SystemDesignProblem
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
    /// Gets or sets the problem source, such as a course, book, or interview list.
    /// </summary>
    public string? Source { get; set; }

    /// <summary>
    /// Gets or sets the external problem URL.
    /// </summary>
    public string? ExternalUrl { get; set; }

    /// <summary>
    /// Gets or sets the markdown prompt or scenario.
    /// </summary>
    public string? PromptMarkdown { get; set; }

    /// <summary>
    /// Gets or sets functional requirements in markdown.
    /// </summary>
    public string? FunctionalRequirementsMarkdown { get; set; }

    /// <summary>
    /// Gets or sets non-functional requirements in markdown.
    /// </summary>
    public string? NonFunctionalRequirementsMarkdown { get; set; }

    /// <summary>
    /// Gets or sets constraints and assumptions in markdown.
    /// </summary>
    public string? ConstraintsMarkdown { get; set; }

    /// <summary>
    /// Gets or sets capacity estimates in markdown.
    /// </summary>
    public string? CapacityEstimatesMarkdown { get; set; }

    /// <summary>
    /// Gets or sets API design notes in markdown.
    /// </summary>
    public string? ApiDesignMarkdown { get; set; }

    /// <summary>
    /// Gets or sets data model notes in markdown.
    /// </summary>
    public string? DataModelMarkdown { get; set; }

    /// <summary>
    /// Gets or sets architecture notes in markdown.
    /// </summary>
    public string? ArchitectureMarkdown { get; set; }

    /// <summary>
    /// Gets or sets scaling strategy notes in markdown.
    /// </summary>
    public string? ScalingStrategyMarkdown { get; set; }

    /// <summary>
    /// Gets or sets tradeoff notes in markdown.
    /// </summary>
    public string? TradeoffsMarkdown { get; set; }

    /// <summary>
    /// Gets or sets latest reflection notes in markdown.
    /// </summary>
    public string? ReflectionMarkdown { get; set; }

    /// <summary>
    /// Gets or sets what helped solve or explain the design.
    /// </summary>
    public string? WhatHelped { get; set; }

    /// <summary>
    /// Gets or sets what was difficult about the design.
    /// </summary>
    public string? WhatWasDifficult { get; set; }

    /// <summary>
    /// Gets or sets what should be improved on the next attempt.
    /// </summary>
    public string? ImproveNext { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the System Design metadata was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the System Design metadata was last updated.
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}
