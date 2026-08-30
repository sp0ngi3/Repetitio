using Repetitio.Application.Basics;

namespace Repetitio.UnitTests.Basics;

/// <summary>
/// Tests for the built-in Basics exercise catalog.
/// </summary>
public sealed class BasicExerciseCatalogTests
{
    /// <summary>
    /// Verifies that Kadane's Algorithm is available as the first MVP Basics exercise.
    /// </summary>
    [Fact]
    public void GetBySlug_WhenKadaneExists_ReturnsReferenceSolution()
    {
        var exercise = BasicExerciseCatalog.GetBySlug("kadane-algorithm");

        Assert.NotNull(exercise);
        Assert.Equal("Kadane's Algorithm", exercise.Title);
        Assert.Contains("MaxSubArray", exercise.ReferenceSolution, StringComparison.Ordinal);
    }

    /// <summary>
    /// Verifies that unknown exercise slugs are not resolved.
    /// </summary>
    [Fact]
    public void GetBySlug_WhenSlugIsUnknown_ReturnsNull()
    {
        var exercise = BasicExerciseCatalog.GetBySlug("not-real");

        Assert.Null(exercise);
    }
}
