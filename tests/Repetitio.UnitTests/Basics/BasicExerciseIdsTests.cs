using Repetitio.Application.Basics;

namespace Repetitio.UnitTests.Basics;

/// <summary>
/// Tests for deterministic Basics exercise identifiers.
/// </summary>
public sealed class BasicExerciseIdsTests
{
    /// <summary>
    /// Verifies that the same Basics slug always maps to the same learning item identifier.
    /// </summary>
    [Fact]
    public void CreateLearningItemId_WhenSlugMatches_ReturnsStableIdentifier()
    {
        var first = BasicExerciseIds.CreateLearningItemId("reverse-linked-list");
        var second = BasicExerciseIds.CreateLearningItemId("Reverse-Linked-List");

        Assert.Equal(first, second);
    }
}
