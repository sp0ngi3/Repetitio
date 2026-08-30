namespace Repetitio.Application.Review;

/// <summary>
/// Calculates simple confidence-based review dates for the MVP.
/// </summary>
public static class ConfidenceReviewSchedule
{
    /// <summary>
    /// Calculates the next review date for a completed session.
    /// </summary>
    /// <param name="completedAt">The UTC completion date used as the schedule anchor.</param>
    /// <param name="confidence">The user's confidence value from 1 to 5.</param>
    /// <returns>The next review date.</returns>
    public static DateTime CalculateNextReviewAt(DateTime completedAt, int confidence)
    {
        return confidence switch
        {
            1 => completedAt.AddDays(1),
            2 => completedAt.AddDays(3),
            3 => completedAt.AddDays(7),
            4 => completedAt.AddDays(14),
            5 => completedAt.AddDays(30),
            _ => completedAt.AddDays(1)
        };
    }
}
