using Repetitio.Domain.Practice;
using Repetitio.Domain.Tags;

namespace Repetitio.Domain.LearningItems;

/// <summary>
/// Represents something the user can practice and review over time.
/// </summary>
public sealed class LearningItem
{
    /// <summary>
    /// Gets or sets the unique learning item identifier.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the learning domain for this item.
    /// </summary>
    public LearningItemType Type { get; set; }

    /// <summary>
    /// Gets or sets the item title.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the optional item description.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the current progress status.
    /// </summary>
    public LearningItemStatus Status { get; set; } = LearningItemStatus.NotStarted;

    /// <summary>
    /// Gets or sets the item difficulty.
    /// </summary>
    public LearningDifficulty Difficulty { get; set; } = LearningDifficulty.Unknown;

    /// <summary>
    /// Gets or sets the current confidence value from 1 to 5.
    /// </summary>
    public int? Confidence { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the item was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the item was last updated.
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the item was last practiced.
    /// </summary>
    public DateTime? LastPracticedAt { get; set; }

    /// <summary>
    /// Gets or sets the next review date and time.
    /// </summary>
    public DateTime? NextReviewAt { get; set; }

    /// <summary>
    /// Gets the tags assigned to this learning item.
    /// </summary>
    public ICollection<LearningItemTag> Tags { get; } = new List<LearningItemTag>();

    /// <summary>
    /// Gets the practice sessions recorded for this learning item.
    /// </summary>
    public ICollection<PracticeSession> PracticeSessions { get; } = new List<PracticeSession>();
}
