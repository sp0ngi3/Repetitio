using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.LearningItems;

/// <summary>
/// Represents the request payload for creating a learning item.
/// </summary>
public sealed record CreateLearningItemRequest
{
    /// <summary>
    /// Gets the learning item type.
    /// </summary>
    public required LearningItemType Type { get; init; }

    /// <summary>
    /// Gets the learning item title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the optional learning item description.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Gets the item difficulty.
    /// </summary>
    public LearningDifficulty Difficulty { get; init; } = LearningDifficulty.Unknown;

    /// <summary>
    /// Gets the tag names that should be assigned to the item.
    /// </summary>
    public IReadOnlyCollection<string> Tags { get; init; } = [];
}

/// <summary>
/// Represents the request payload for updating a learning item.
/// </summary>
public sealed record UpdateLearningItemRequest
{
    /// <summary>
    /// Gets the learning item type.
    /// </summary>
    public required LearningItemType Type { get; init; }

    /// <summary>
    /// Gets the learning item title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the optional learning item description.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Gets the current progress status.
    /// </summary>
    public LearningItemStatus Status { get; init; }

    /// <summary>
    /// Gets the item difficulty.
    /// </summary>
    public LearningDifficulty Difficulty { get; init; }

    /// <summary>
    /// Gets the current confidence value from 1 to 5.
    /// </summary>
    public int? Confidence { get; init; }

    /// <summary>
    /// Gets the tag names that should be assigned to the item.
    /// </summary>
    public IReadOnlyCollection<string> Tags { get; init; } = [];
}

/// <summary>
/// Represents a learning item returned by the API.
/// </summary>
public sealed record LearningItemResponse
{
    /// <summary>
    /// Gets the unique learning item identifier.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the learning item type.
    /// </summary>
    public required LearningItemType Type { get; init; }

    /// <summary>
    /// Gets the learning item title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the optional learning item description.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Gets the current progress status.
    /// </summary>
    public required LearningItemStatus Status { get; init; }

    /// <summary>
    /// Gets the item difficulty.
    /// </summary>
    public required LearningDifficulty Difficulty { get; init; }

    /// <summary>
    /// Gets the current confidence value from 1 to 5.
    /// </summary>
    public int? Confidence { get; init; }

    /// <summary>
    /// Gets the date and time when the item was created.
    /// </summary>
    public required DateTime CreatedAt { get; init; }

    /// <summary>
    /// Gets the date and time when the item was last updated.
    /// </summary>
    public required DateTime UpdatedAt { get; init; }

    /// <summary>
    /// Gets the date and time when the item was last practiced.
    /// </summary>
    public DateTime? LastPracticedAt { get; init; }

    /// <summary>
    /// Gets the next review date and time.
    /// </summary>
    public DateTime? NextReviewAt { get; init; }

    /// <summary>
    /// Gets the item tag names.
    /// </summary>
    public required IReadOnlyCollection<string> Tags { get; init; }

    /// <summary>
    /// Gets the total number of recorded attempts.
    /// </summary>
    public required int TotalAttempts { get; init; }
}
