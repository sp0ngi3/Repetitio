using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.Basics.Exercises;

/// <summary>
/// Provides built-in Basics exercises for sorting algorithms.
/// </summary>
public static class SortingExercises
{
    /// <summary>
    /// Gets the sorting algorithms exercise.
    /// </summary>
    public static BasicExerciseResponse SortingAlgorithms { get; } = BasicExerciseFactory.Create(
        "sorting-algorithms",
        "Sorting: Insertion, Merge, Quick, Bucket",
        LearningDifficulty.Medium,
        "Implement four classic sorting algorithms that return sorted copies of integer arrays.",
        """
Implement four methods:

- InsertionSort
- MergeSort
- QuickSort
- BucketSort

Each method receives an integer array and returns a sorted array in ascending order. Do not mutate the caller's input array.
""",
        """
Example 1:
Input: nums = [5,2,3,1]
Output: [1,2,3,5]

Example 2:
Input: nums = [-2,3,-5]
Output: [-5,-2,3]
""",
        """
- 0 <= nums.length <= 10000.
- Values may be negative.
- Duplicates are allowed.
- Insertion sort target: O(n^2).
- Merge sort target: O(n log n).
- Quick sort average target: O(n log n).
- Bucket sort target: O(n + k) for a reasonable value range.
""",
        """
InsertionSort([5,2,3,1]) => [1,2,3,5]
InsertionSort([]) => []
InsertionSort([1]) => [1]
MergeSort([10,-1,2,2]) => [-1,2,2,10]
MergeSort([3,2,1]) => [1,2,3]
QuickSort([9,7,5,3]) => [3,5,7,9]
QuickSort([1,1,1]) => [1,1,1]
BucketSort([5,0,2,5,1]) => [0,1,2,5,5]
BucketSort([-3,0,2,-3]) => [-3,-3,0,2]
All methods keep the original input unchanged.
""",
        """
Start with a copy of nums. Keep insertion sort simple. For merge sort, split and merge. For quick sort, partition around a pivot. For bucket sort, count values from min to max.
""",
        """
public static int[] InsertionSort(int[] nums)
public static int[] MergeSort(int[] nums)
public static int[] QuickSort(int[] nums)
public static int[] BucketSort(int[] nums)
""",
        ["array", "sorting", "insertion-sort", "merge-sort", "quick-sort", "bucket-sort"],
        StarterCode(),
        ReferenceSolution());

    /// <summary>
    /// Creates starter code for the sorting algorithms exercise.
    /// </summary>
    /// <returns>The starter code.</returns>
    private static string StarterCode()
    {
        return """
public static class Solution
{
    /// <summary>
    /// Sorts values with insertion sort.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>A sorted copy of the input.</returns>
    public static int[] InsertionSort(int[] nums)
    {
        return nums;
    }

    /// <summary>
    /// Sorts values with merge sort.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>A sorted copy of the input.</returns>
    public static int[] MergeSort(int[] nums)
    {
        return nums;
    }

    /// <summary>
    /// Sorts values with quick sort.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>A sorted copy of the input.</returns>
    public static int[] QuickSort(int[] nums)
    {
        return nums;
    }

    /// <summary>
    /// Sorts values with bucket sort.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>A sorted copy of the input.</returns>
    public static int[] BucketSort(int[] nums)
    {
        return nums;
    }
}
""";
    }

    /// <summary>
    /// Creates reference code for the sorting algorithms exercise.
    /// </summary>
    /// <returns>The reference solution.</returns>
    private static string ReferenceSolution()
    {
        return """
public static class Solution
{
    /// <summary>
    /// Sorts values with insertion sort.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>A sorted copy of the input.</returns>
    public static int[] InsertionSort(int[] nums)
    {
        var values = nums.ToArray();

        for (var index = 1; index < values.Length; index++)
        {
            var current = values[index];
            var previous = index - 1;

            while (previous >= 0 && values[previous] > current)
            {
                values[previous + 1] = values[previous];
                previous--;
            }

            values[previous + 1] = current;
        }

        return values;
    }

    /// <summary>
    /// Sorts values with merge sort.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>A sorted copy of the input.</returns>
    public static int[] MergeSort(int[] nums)
    {
        if (nums.Length <= 1)
        {
            return nums.ToArray();
        }

        var middle = nums.Length / 2;
        var left = MergeSort(nums[..middle]);
        var right = MergeSort(nums[middle..]);
        var merged = new int[nums.Length];
        var i = 0;
        var j = 0;
        var write = 0;

        while (i < left.Length && j < right.Length)
        {
            merged[write++] = left[i] <= right[j] ? left[i++] : right[j++];
        }

        while (i < left.Length)
        {
            merged[write++] = left[i++];
        }

        while (j < right.Length)
        {
            merged[write++] = right[j++];
        }

        return merged;
    }

    /// <summary>
    /// Sorts values with quick sort.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>A sorted copy of the input.</returns>
    public static int[] QuickSort(int[] nums)
    {
        var values = nums.ToArray();
        QuickSort(values, 0, values.Length - 1);
        return values;
    }

    /// <summary>
    /// Sorts values with bucket sort.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>A sorted copy of the input.</returns>
    public static int[] BucketSort(int[] nums)
    {
        if (nums.Length == 0)
        {
            return [];
        }

        var min = nums.Min();
        var max = nums.Max();
        var counts = new int[max - min + 1];

        foreach (var value in nums)
        {
            counts[value - min]++;
        }

        var result = new int[nums.Length];
        var write = 0;

        for (var index = 0; index < counts.Length; index++)
        {
            while (counts[index] > 0)
            {
                result[write++] = index + min;
                counts[index]--;
            }
        }

        return result;
    }

    /// <summary>
    /// Sorts one partition with quick sort.
    /// </summary>
    /// <param name="values">The values being sorted.</param>
    /// <param name="left">The left boundary.</param>
    /// <param name="right">The right boundary.</param>
    private static void QuickSort(int[] values, int left, int right)
    {
        if (left >= right)
        {
            return;
        }

        var pivot = values[right];
        var partition = left;

        for (var index = left; index < right; index++)
        {
            if (values[index] <= pivot)
            {
                (values[partition], values[index]) = (values[index], values[partition]);
                partition++;
            }
        }

        (values[partition], values[right]) = (values[right], values[partition]);
        QuickSort(values, left, partition - 1);
        QuickSort(values, partition + 1, right);
    }
}
""";
    }
}
