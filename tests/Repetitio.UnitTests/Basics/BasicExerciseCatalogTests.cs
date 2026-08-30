using Repetitio.Application.Basics;

namespace Repetitio.UnitTests.Basics;

/// <summary>
/// Tests for the built-in Basics exercise catalog.
/// </summary>
public sealed class BasicExerciseCatalogTests
{
    /// <summary>
    /// Verifies that Reverse Linked List is available as the current MVP Basics exercise.
    /// </summary>
    [Fact]
    public void GetBySlug_WhenReverseLinkedListExists_ReturnsReferenceSolution()
    {
        var exercise = BasicExerciseCatalog.GetBySlug("reverse-linked-list");

        Assert.NotNull(exercise);
        Assert.Equal("Reverse Linked List", exercise.Title);
        Assert.Contains("public static class Solution", exercise.StarterCode, StringComparison.Ordinal);
        Assert.Contains("public static ListNode? Reverse(ListNode? head)", exercise.StarterCode, StringComparison.Ordinal);
        Assert.Contains("previous", exercise.ReferenceSolution, StringComparison.Ordinal);
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

    /// <summary>
    /// Verifies that the temporary Basics catalog contains only Reverse Linked List.
    /// </summary>
    [Fact]
    public void GetAll_WhenRead_ReturnsOnlyReverseLinkedList()
    {
        var exercise = Assert.Single(BasicExerciseCatalog.GetAll());

        Assert.Equal("reverse-linked-list", exercise.Slug);
    }

    /// <summary>
    /// Verifies that every built-in Basics exercise has a unique slug.
    /// </summary>
    [Fact]
    public void GetAll_WhenRead_ReturnsUniqueSlugs()
    {
        var exercises = BasicExerciseCatalog.GetAll();
        var slugs = exercises.Select(exercise => exercise.Slug).ToArray();

        Assert.Equal(slugs.Length, slugs.Distinct(StringComparer.OrdinalIgnoreCase).Count());
    }

    /// <summary>
    /// Verifies that every built-in Basics exercise exposes the content required by the detail page.
    /// </summary>
    [Fact]
    public void GetAll_WhenRead_ReturnsCompleteExerciseContent()
    {
        foreach (var exercise in BasicExerciseCatalog.GetAll())
        {
            Assert.False(string.IsNullOrWhiteSpace(exercise.Title));
            Assert.False(string.IsNullOrWhiteSpace(exercise.ProblemStatement));
            Assert.False(string.IsNullOrWhiteSpace(exercise.Examples));
            Assert.False(string.IsNullOrWhiteSpace(exercise.Constraints));
            Assert.False(string.IsNullOrWhiteSpace(exercise.TestCases));
            Assert.False(string.IsNullOrWhiteSpace(exercise.StarterCode));
            Assert.False(string.IsNullOrWhiteSpace(exercise.ReferenceSolution));
            Assert.NotEmpty(exercise.Tags);
        }
    }
}
