using Repetitio.Domain.LearningItems;
using Repetitio.Domain.Practice;

namespace Repetitio.Application.Practice;

/// <summary>
/// Applies progress rules after practice attempts.
/// </summary>
public static class PracticeProgressPolicy
{
    /// <summary>
    /// Gets the successful attempt count required before a problem is mastered.
    /// </summary>
    public const int MasteredSuccessfulAttemptThreshold = 6;

    /// <summary>
    /// Calculates the next learning item status after a practice attempt.
    /// </summary>
    /// <param name="currentStatus">The current learning item status.</param>
    /// <param name="outcome">The latest practice outcome.</param>
    /// <param name="successfulAttemptCount">The total successful attempt count including the latest attempt.</param>
    /// <returns>The next learning item status.</returns>
    public static LearningItemStatus CalculateStatus(
        LearningItemStatus currentStatus,
        PracticeOutcome outcome,
        int successfulAttemptCount)
    {
        return outcome switch
        {
            PracticeOutcome.Passed or PracticeOutcome.Completed
                when successfulAttemptCount >= MasteredSuccessfulAttemptThreshold => LearningItemStatus.Mastered,
            PracticeOutcome.Passed or PracticeOutcome.Completed
                when currentStatus != LearningItemStatus.Mastered => LearningItemStatus.Completed,
            PracticeOutcome.Partial or PracticeOutcome.Failed
                when currentStatus == LearningItemStatus.NotStarted => LearningItemStatus.InProgress,
            _ => currentStatus
        };
    }

    /// <summary>
    /// Returns whether a practice session counts as a solved attempt.
    /// </summary>
    /// <param name="session">The practice session.</param>
    /// <returns><see langword="true"/> when the session outcome is successful; otherwise, <see langword="false"/>.</returns>
    public static bool IsSuccessfulAttempt(PracticeSession session)
    {
        return IsSuccessfulOutcome(session.Outcome);
    }

    /// <summary>
    /// Returns whether a practice outcome counts as a solved attempt.
    /// </summary>
    /// <param name="outcome">The practice outcome.</param>
    /// <returns><see langword="true"/> when the outcome is successful; otherwise, <see langword="false"/>.</returns>
    public static bool IsSuccessfulOutcome(PracticeOutcome outcome)
    {
        return outcome is PracticeOutcome.Completed or PracticeOutcome.Passed;
    }
}
