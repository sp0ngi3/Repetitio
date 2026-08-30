using Repetitio.Application.Review;

namespace Repetitio.UnitTests.Review;

/// <summary>
/// Tests for the MVP confidence-based review schedule.
/// </summary>
public sealed class ConfidenceReviewScheduleTests
{
    /// <summary>
    /// Verifies that each confidence level maps to the expected review interval.
    /// </summary>
    /// <param name="confidence">The confidence value.</param>
    /// <param name="expectedDays">The expected number of days until review.</param>
    [Theory]
    [InlineData(1, 1)]
    [InlineData(2, 3)]
    [InlineData(3, 7)]
    [InlineData(4, 14)]
    [InlineData(5, 30)]
    public void CalculateNextReviewAt_WhenConfidenceIsKnown_ReturnsExpectedDate(int confidence, int expectedDays)
    {
        var completedAt = new DateTime(2026, 8, 30, 12, 0, 0, DateTimeKind.Utc);

        var nextReviewAt = ConfidenceReviewSchedule.CalculateNextReviewAt(completedAt, confidence);

        Assert.Equal(completedAt.AddDays(expectedDays), nextReviewAt);
    }

    /// <summary>
    /// Verifies that invalid confidence falls back to the shortest interval.
    /// </summary>
    [Fact]
    public void CalculateNextReviewAt_WhenConfidenceIsUnknown_ReturnsTomorrow()
    {
        var completedAt = new DateTime(2026, 8, 30, 12, 0, 0, DateTimeKind.Utc);

        var nextReviewAt = ConfidenceReviewSchedule.CalculateNextReviewAt(completedAt, 99);

        Assert.Equal(completedAt.AddDays(1), nextReviewAt);
    }
}
