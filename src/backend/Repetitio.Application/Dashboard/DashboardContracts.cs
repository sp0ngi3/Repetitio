using Repetitio.Application.Practice;
using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.Dashboard;

/// <summary>
/// Represents the dashboard overview returned by the API.
/// </summary>
public sealed record DashboardResponse
{
    /// <summary>
    /// Gets the number of practice sessions created today.
    /// </summary>
    public required int PracticesToday { get; init; }

    /// <summary>
    /// Gets the number of practice sessions created during the last seven days.
    /// </summary>
    public required int PracticesThisWeek { get; init; }

    /// <summary>
    /// Gets the number of learning items due for review.
    /// </summary>
    public required int DueReviewCount { get; init; }

    /// <summary>
    /// Gets the number of learning items that have never been practiced.
    /// </summary>
    public required int NeverPracticedCount { get; init; }

    /// <summary>
    /// Gets the learning items currently due for review.
    /// </summary>
    public required IReadOnlyCollection<DueReviewItemResponse> DueReviews { get; init; }

    /// <summary>
    /// Gets the most recent practice sessions.
    /// </summary>
    public required IReadOnlyCollection<PracticeSessionResponse> RecentPractice { get; init; }
}

/// <summary>
/// Represents a learning item due for review.
/// </summary>
public sealed record DueReviewItemResponse
{
    /// <summary>
    /// Gets the unique learning item identifier.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the learning item title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the learning item type.
    /// </summary>
    public required LearningItemType Type { get; init; }

    /// <summary>
    /// Gets the date and time when the item was last practiced.
    /// </summary>
    public DateTime? LastPracticedAt { get; init; }

    /// <summary>
    /// Gets the next review date and time.
    /// </summary>
    public DateTime? NextReviewAt { get; init; }

    /// <summary>
    /// Gets the current confidence value from 1 to 5.
    /// </summary>
    public int? Confidence { get; init; }
}
