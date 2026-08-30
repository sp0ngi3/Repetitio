using Repetitio.Application.LearningItems;
using Repetitio.Domain.LearningItems;

namespace Repetitio.UnitTests.LearningItems;

/// <summary>
/// Tests for user-managed learning item rules.
/// </summary>
public sealed class LearningItemRulesTests
{
    /// <summary>
    /// Verifies that users can create only DSA and System Design items.
    /// </summary>
    /// <param name="type">The learning item type.</param>
    /// <param name="expected">The expected rule result.</param>
    [Theory]
    [InlineData(LearningItemType.Basics, false)]
    [InlineData(LearningItemType.Dsa, true)]
    [InlineData(LearningItemType.SystemDesign, true)]
    public void CanBeCreatedByUser_ReturnsExpectedResult(LearningItemType type, bool expected)
    {
        var result = LearningItemRules.CanBeCreatedByUser(type);

        Assert.Equal(expected, result);
    }
}
