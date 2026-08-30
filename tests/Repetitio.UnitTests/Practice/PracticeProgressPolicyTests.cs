using Repetitio.Application.Practice;
using Repetitio.Domain.LearningItems;
using Repetitio.Domain.Practice;

namespace Repetitio.UnitTests.Practice;

/// <summary>
/// Tests for learning item progress rules after practice attempts.
/// </summary>
public sealed class PracticeProgressPolicyTests
{
    /// <summary>
    /// Verifies that a failed first attempt moves a new item into progress.
    /// </summary>
    [Fact]
    public void CalculateStatus_WhenFirstAttemptFails_ReturnsInProgress()
    {
        var status = PracticeProgressPolicy.CalculateStatus(
            LearningItemStatus.NotStarted,
            PracticeOutcome.Failed,
            successfulAttemptCount: 0);

        Assert.Equal(LearningItemStatus.InProgress, status);
    }

    /// <summary>
    /// Verifies that a solved attempt marks an item as completed before mastery.
    /// </summary>
    [Fact]
    public void CalculateStatus_WhenSolvedBeforeThreshold_ReturnsCompleted()
    {
        var status = PracticeProgressPolicy.CalculateStatus(
            LearningItemStatus.InProgress,
            PracticeOutcome.Completed,
            successfulAttemptCount: 3);

        Assert.Equal(LearningItemStatus.Completed, status);
    }

    /// <summary>
    /// Verifies that the sixth solved attempt marks an item as mastered.
    /// </summary>
    [Fact]
    public void CalculateStatus_WhenSixthSolvedAttemptCompletes_ReturnsMastered()
    {
        var status = PracticeProgressPolicy.CalculateStatus(
            LearningItemStatus.Completed,
            PracticeOutcome.Passed,
            successfulAttemptCount: PracticeProgressPolicy.MasteredSuccessfulAttemptThreshold);

        Assert.Equal(LearningItemStatus.Mastered, status);
    }
}
