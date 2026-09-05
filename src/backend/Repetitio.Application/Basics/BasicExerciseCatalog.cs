using Repetitio.Application.Basics.Exercises;

namespace Repetitio.Application.Basics;

/// <summary>
/// Provides the hardcoded Basics exercise catalog for the MVP.
/// </summary>
public static class BasicExerciseCatalog
{
    /// <summary>
    /// Gets all built-in Basics exercises.
    /// </summary>
    /// <returns>The built-in exercise definitions.</returns>
    public static IReadOnlyCollection<BasicExerciseResponse> GetAll()
    {
        return Exercises;
    }

    /// <summary>
    /// Gets a built-in Basics exercise by slug.
    /// </summary>
    /// <param name="slug">The exercise slug.</param>
    /// <returns>The matching exercise when found; otherwise, <see langword="null"/>.</returns>
    public static BasicExerciseResponse? GetBySlug(string slug)
    {
        return Exercises.FirstOrDefault(exercise => exercise.Slug.Equals(slug, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Gets the registered built-in exercise list.
    /// </summary>
    private static readonly BasicExerciseResponse[] Exercises =
    [
        ReverseLinkedListExercise.Definition,
        LinkedListTechniqueExercises.LinkedListInsertAtHead,
        LinkedListTechniqueExercises.LinkedListInsertAtEnd,
        LinkedListTechniqueExercises.LinkedListInsertAtIndex,
        LinkedListTechniqueExercises.LinkedListGet,
        LinkedListTechniqueExercises.DetectLinkedListCycle,
        RecursionExercises.Factorial,
        RecursionExercises.Fibonacci,
        SortingExercises.InsertionSort,
        SortingExercises.MergeSort,
        SortingExercises.QuickSort,
        SortingExercises.BucketSort,
        SortingExercises.RadixSort,
        BinarySearchExercises.SearchSortedArray
    ];
}
