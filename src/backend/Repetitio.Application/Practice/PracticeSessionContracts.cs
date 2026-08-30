using Repetitio.Domain.Practice;

namespace Repetitio.Application.Practice;

/// <summary>
/// Represents the request payload for recording a practice session.
/// </summary>
public sealed record CreatePracticeSessionRequest
{
    /// <summary>
    /// Gets the practiced learning item identifier.
    /// </summary>
    public required Guid LearningItemId { get; init; }

    /// <summary>
    /// Gets the optional session start date and time.
    /// </summary>
    public DateTime? StartedAt { get; init; }

    /// <summary>
    /// Gets the optional session completion date and time.
    /// </summary>
    public DateTime? CompletedAt { get; init; }

    /// <summary>
    /// Gets the optional session duration in milliseconds.
    /// </summary>
    public long? DurationMs { get; init; }

    /// <summary>
    /// Gets the practice outcome.
    /// </summary>
    public PracticeOutcome Outcome { get; init; } = PracticeOutcome.Completed;

    /// <summary>
    /// Gets the confidence value from 1 to 5.
    /// </summary>
    public int? Confidence { get; init; }

    /// <summary>
    /// Gets free-form notes about the session.
    /// </summary>
    public string? Notes { get; init; }

    /// <summary>
    /// Gets what helped during the session.
    /// </summary>
    public string? WhatHelped { get; init; }

    /// <summary>
    /// Gets what was difficult during the session.
    /// </summary>
    public string? WhatWasDifficult { get; init; }

    /// <summary>
    /// Gets what should be improved next time.
    /// </summary>
    public string? ImproveNext { get; init; }
}

/// <summary>
/// Represents a practice session returned by the API.
/// </summary>
public sealed record PracticeSessionResponse
{
    /// <summary>
    /// Gets the unique practice session identifier.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the practiced learning item identifier.
    /// </summary>
    public required Guid LearningItemId { get; init; }

    /// <summary>
    /// Gets the practiced learning item title.
    /// </summary>
    public required string LearningItemTitle { get; init; }

    /// <summary>
    /// Gets the date and time when the session started.
    /// </summary>
    public required DateTime StartedAt { get; init; }

    /// <summary>
    /// Gets the date and time when the session completed.
    /// </summary>
    public DateTime? CompletedAt { get; init; }

    /// <summary>
    /// Gets the session duration in milliseconds.
    /// </summary>
    public long? DurationMs { get; init; }

    /// <summary>
    /// Gets the practice outcome.
    /// </summary>
    public required PracticeOutcome Outcome { get; init; }

    /// <summary>
    /// Gets the confidence value from 1 to 5.
    /// </summary>
    public int? Confidence { get; init; }

    /// <summary>
    /// Gets free-form notes about the session.
    /// </summary>
    public string? Notes { get; init; }

    /// <summary>
    /// Gets what helped during the session.
    /// </summary>
    public string? WhatHelped { get; init; }

    /// <summary>
    /// Gets what was difficult during the session.
    /// </summary>
    public string? WhatWasDifficult { get; init; }

    /// <summary>
    /// Gets what should be improved next time.
    /// </summary>
    public string? ImproveNext { get; init; }

    /// <summary>
    /// Gets the date and time when the session record was created.
    /// </summary>
    public required DateTime CreatedAt { get; init; }
}
