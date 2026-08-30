using Repetitio.Domain.LearningItems;

namespace Repetitio.Domain.Practice;

/// <summary>
/// Represents one recorded attempt to practice a learning item.
/// </summary>
public sealed class PracticeSession
{
    /// <summary>
    /// Gets or sets the unique practice session identifier.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the practiced learning item identifier.
    /// </summary>
    public Guid LearningItemId { get; set; }

    /// <summary>
    /// Gets or sets the practiced learning item.
    /// </summary>
    public LearningItem LearningItem { get; set; } = null!;

    /// <summary>
    /// Gets or sets the date and time when the session started.
    /// </summary>
    public DateTime StartedAt { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the session completed.
    /// </summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// Gets or sets the session duration in milliseconds.
    /// </summary>
    public long? DurationMs { get; set; }

    /// <summary>
    /// Gets or sets the practice outcome.
    /// </summary>
    public PracticeOutcome Outcome { get; set; }

    /// <summary>
    /// Gets or sets the confidence value from 1 to 5 after the attempt.
    /// </summary>
    public int? Confidence { get; set; }

    /// <summary>
    /// Gets or sets free-form notes about the attempt.
    /// </summary>
    public string? Notes { get; set; }

    /// <summary>
    /// Gets or sets what helped during the attempt.
    /// </summary>
    public string? WhatHelped { get; set; }

    /// <summary>
    /// Gets or sets what was difficult during the attempt.
    /// </summary>
    public string? WhatWasDifficult { get; set; }

    /// <summary>
    /// Gets or sets what should be improved next time.
    /// </summary>
    public string? ImproveNext { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the session record was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }
}
