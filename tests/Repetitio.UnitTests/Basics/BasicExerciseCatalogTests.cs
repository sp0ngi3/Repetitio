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
    /// Verifies that the Basics catalog contains the implemented Phase exercises.
    /// </summary>
    [Fact]
    public void GetAll_WhenRead_ReturnsImplementedPhaseExercises()
    {
        var slugs = BasicExerciseCatalog.GetAll().Select(exercise => exercise.Slug).ToHashSet(StringComparer.Ordinal);

        Assert.Contains("reverse-linked-list", slugs);
        Assert.Contains("two-pointers-two-sum-sorted", slugs);
        Assert.DoesNotContain("kadane-maximum-subarray", slugs);
        Assert.DoesNotContain("kadane-max-subarray-range", slugs);
        Assert.DoesNotContain("prefix-sum-range-query", slugs);
        Assert.DoesNotContain("prefix-sum-pivot-index", slugs);
        Assert.DoesNotContain("sliding-window-max-average", slugs);
        Assert.DoesNotContain("sliding-window-min-size-subarray-sum", slugs);
        Assert.Contains("linked-list-insert", slugs);
        Assert.Contains("linked-list-get", slugs);
        Assert.Contains("fast-slow-detect-linked-list-cycle", slugs);
        Assert.DoesNotContain("fast-slow-find-duplicate-number", slugs);
        Assert.Contains("recursion-factorial", slugs);
        Assert.Contains("recursion-fibonacci", slugs);
        Assert.Contains("insertion-sort", slugs);
        Assert.Contains("merge-sort", slugs);
        Assert.Contains("quick-sort", slugs);
        Assert.Contains("bucket-sort", slugs);
        Assert.Contains("radix-sort", slugs);
        Assert.DoesNotContain("sorting-algorithms", slugs);
        Assert.Contains("binary-search-sorted-array", slugs);
        Assert.DoesNotContain("binary-search-first-passing-version", slugs);
    }

    /// <summary>
    /// Verifies that every sorting algorithm is exposed as an independent exercise.
    /// </summary>
    [Fact]
    public void GetAll_WhenSortingExercisesAreRead_ExposesOneSortMethodPerExercise()
    {
        var sortingExercises = BasicExerciseCatalog.GetAll()
            .Where(exercise => exercise.Tags.Contains("sorting", StringComparer.Ordinal))
            .ToArray();

        Assert.Equal(5, sortingExercises.Length);
        Assert.All(sortingExercises, exercise =>
            Assert.Equal("public static int[] Sort(int[] nums)", exercise.FunctionSignature));
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
