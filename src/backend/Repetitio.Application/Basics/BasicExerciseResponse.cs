using Repetitio.Application.Practice;
using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.Basics;

/// <summary>
/// Represents a built-in Basics exercise returned by the API.
/// </summary>
public record BasicExerciseResponse
{
    /// <summary>
    /// Gets the stable exercise slug.
    /// </summary>
    public required string Slug { get; init; }

    /// <summary>
    /// Gets the exercise title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the programming language used by the exercise.
    /// </summary>
    public required string Language { get; init; }

    /// <summary>
    /// Gets the exercise difficulty.
    /// </summary>
    public required LearningDifficulty Difficulty { get; init; }

    /// <summary>
    /// Gets the exercise instructions.
    /// </summary>
    public required string Instructions { get; init; }

    /// <summary>
    /// Gets the detailed problem statement.
    /// </summary>
    public required string ProblemStatement { get; init; }

    /// <summary>
    /// Gets worked examples for the exercise.
    /// </summary>
    public required string Examples { get; init; }

    /// <summary>
    /// Gets the input constraints for the exercise.
    /// </summary>
    public required string Constraints { get; init; }

    /// <summary>
    /// Gets suggested test cases for local practice.
    /// </summary>
    public required string TestCases { get; init; }

    /// <summary>
    /// Gets a short explanation of the intended approach.
    /// </summary>
    public required string ApproachGuide { get; init; }

    /// <summary>
    /// Gets the starter code shown to the user.
    /// </summary>
    public required string StarterCode { get; init; }

    /// <summary>
    /// Gets the function signature expected by the exercise.
    /// </summary>
    public required string FunctionSignature { get; init; }

    /// <summary>
    /// Gets the reference solution that can be peeked by the user.
    /// </summary>
    public required string ReferenceSolution { get; init; }

    /// <summary>
    /// Gets the tag names associated with the exercise.
    /// </summary>
    public required IReadOnlyCollection<string> Tags { get; init; }
}

/// <summary>
/// Represents a built-in Basics exercise with persisted practice progress.
/// </summary>
public sealed record BasicExerciseProgressResponse : BasicExerciseResponse
{
    /// <summary>
    /// Gets the related learning item identifier used for practice tracking.
    /// </summary>
    public required Guid LearningItemId { get; init; }

    /// <summary>
    /// Gets the current progress status.
    /// </summary>
    public required LearningItemStatus Status { get; init; }

    /// <summary>
    /// Gets the current confidence value from 1 to 5.
    /// </summary>
    public int? Confidence { get; init; }

    /// <summary>
    /// Gets the date and time when the exercise was last practiced.
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
    /// Gets recorded practice sessions for the exercise.
    /// </summary>
    public required IReadOnlyCollection<PracticeSessionResponse> PracticeSessions { get; init; }
}
