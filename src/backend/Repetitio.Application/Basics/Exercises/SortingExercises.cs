using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.Basics.Exercises;

/// <summary>
/// Provides one built-in Basics exercise for each supported sorting algorithm.
/// </summary>
public static class SortingExercises
{
    /// <summary>
    /// Gets the insertion sort exercise.
    /// </summary>
    public static BasicExerciseResponse InsertionSort { get; } = CreateDefinition(
        "insertion-sort",
        "Insertion Sort",
        "insertion sort",
        "Insert each value into the sorted prefix that comes before it.",
        """
Implement insertion sort. Return a new integer array containing the same values in ascending order.

The returned array must be sorted without mutating the caller's input array. Insertion sort grows a sorted prefix one value at a time by shifting larger values to the right.
""",
        """
Example 1:
Input: nums = [5,2,3,1]
Output: [1,2,3,5]

Example 2:
Input: nums = [4,1,4,2]
Output: [1,2,4,4]
""",
        """
- 0 <= nums.length <= 10000.
- -10000 <= nums[i] <= 10000.
- Duplicate values are allowed.
- Target time complexity: O(n^2).
- Target extra space complexity: O(n).
""",
        """
Sort([5,2,3,1]) => [1,2,3,5]
Sort([]) => []
Sort([1]) => [1]
Sort([4,1,4,2]) => [1,2,4,4]
Sort([-3,0,-2,5]) => [-3,-2,0,5]
Sort([2,2,2]) => [2,2,2]
The original input array remains unchanged.
""",
        """
Copy nums first so the caller's array is preserved. Treat the first value as a sorted prefix, then shift larger prefix values right until the current value fits.
""",
        ["array", "sorting", "insertion-sort"],
        """
public static class Solution
{
    /// <summary>
    /// Sorts values with insertion sort.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>A sorted copy of the input.</returns>
    public static int[] Sort(int[] nums)
    {
        return nums;
    }
}
""",
        """
public static class Solution
{
    /// <summary>
    /// Sorts values with insertion sort.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>A sorted copy of the input.</returns>
    public static int[] Sort(int[] nums)
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
}
""");

    /// <summary>
    /// Gets the merge sort exercise.
    /// </summary>
    public static BasicExerciseResponse MergeSort { get; } = CreateDefinition(
        "merge-sort",
        "Merge Sort",
        "merge sort",
        "Split the array, sort both halves, and merge the sorted halves.",
        """
Implement merge sort. Return a new integer array containing the same values in ascending order.

Merge sort should divide the input into smaller ranges until each range has at most one value, then merge those ranges while preserving sorted order. Do not mutate the caller's input array.
""",
        """
Example 1:
Input: nums = [10,-1,2,2]
Output: [-1,2,2,10]

Example 2:
Input: nums = [3,2,1]
Output: [1,2,3]
""",
        """
- 0 <= nums.length <= 10000.
- -10000 <= nums[i] <= 10000.
- Duplicate values are allowed.
- Target time complexity: O(n log n).
- Target extra space complexity: O(n).
""",
        """
Sort([10,-1,2,2]) => [-1,2,2,10]
Sort([3,2,1]) => [1,2,3]
Sort([]) => []
Sort([7]) => [7]
Sort([0,-5,0,3]) => [-5,0,0,3]
The original input array remains unchanged.
""",
        """
Split nums around the middle. Recursively sort each half, then merge by repeatedly taking the smaller front value from the two sorted halves.
""",
        ["array", "sorting", "merge-sort", "divide-and-conquer"],
        """
public static class Solution
{
    /// <summary>
    /// Sorts values with merge sort.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>A sorted copy of the input.</returns>
    public static int[] Sort(int[] nums)
    {
        return nums;
    }
}
""",
        """
public static class Solution
{
    /// <summary>
    /// Sorts values with merge sort.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>A sorted copy of the input.</returns>
    public static int[] Sort(int[] nums)
    {
        if (nums.Length <= 1)
        {
            return nums.ToArray();
        }

        var middle = nums.Length / 2;
        var left = Sort(nums[..middle]);
        var right = Sort(nums[middle..]);
        var merged = new int[nums.Length];
        var leftIndex = 0;
        var rightIndex = 0;
        var writeIndex = 0;

        while (leftIndex < left.Length && rightIndex < right.Length)
        {
            merged[writeIndex++] = left[leftIndex] <= right[rightIndex]
                ? left[leftIndex++]
                : right[rightIndex++];
        }

        while (leftIndex < left.Length)
        {
            merged[writeIndex++] = left[leftIndex++];
        }

        while (rightIndex < right.Length)
        {
            merged[writeIndex++] = right[rightIndex++];
        }

        return merged;
    }
}
""");

    /// <summary>
    /// Gets the quick sort exercise.
    /// </summary>
    public static BasicExerciseResponse QuickSort { get; } = CreateDefinition(
        "quick-sort",
        "Quick Sort",
        "quick sort",
        "Partition the array around a pivot and recursively sort both sides.",
        """
Implement quick sort. Return a new integer array containing the same values in ascending order.

Choose a pivot, move values smaller than or equal to it before the pivot, and recursively sort the two resulting partitions. Do not mutate the caller's input array.
""",
        """
Example 1:
Input: nums = [9,7,5,3]
Output: [3,5,7,9]

Example 2:
Input: nums = [4,1,4,2,8]
Output: [1,2,4,4,8]
""",
        """
- 0 <= nums.length <= 10000.
- -10000 <= nums[i] <= 10000.
- Duplicate values are allowed.
- Average target time complexity: O(n log n).
- Target extra space complexity: O(log n) for recursion.
""",
        """
Sort([9,7,5,3]) => [3,5,7,9]
Sort([1,1,1]) => [1,1,1]
Sort([]) => []
Sort([-2,4,0,-2]) => [-2,-2,0,4]
Sort([6,2,9,1,5]) => [1,2,5,6,9]
The original input array remains unchanged.
""",
        """
Copy nums, choose a pivot, partition the copy, and recursively sort the ranges on each side of the pivot. Make sure equal values still make progress.
""",
        ["array", "sorting", "quick-sort", "partitioning"],
        """
public static class Solution
{
    /// <summary>
    /// Sorts values with quick sort.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>A sorted copy of the input.</returns>
    public static int[] Sort(int[] nums)
    {
        return nums;
    }
}
""",
        """
public static class Solution
{
    /// <summary>
    /// Sorts values with quick sort.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>A sorted copy of the input.</returns>
    public static int[] Sort(int[] nums)
    {
        var values = nums.ToArray();
        QuickSort(values, 0, values.Length - 1);
        return values;
    }

    /// <summary>
    /// Sorts one inclusive partition of the copied array.
    /// </summary>
    /// <param name="values">The copied values being sorted.</param>
    /// <param name="left">The inclusive left boundary.</param>
    /// <param name="right">The inclusive right boundary.</param>
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
""");

    /// <summary>
    /// Gets the bucket sort exercise.
    /// </summary>
    public static BasicExerciseResponse BucketSort { get; } = CreateDefinition(
        "bucket-sort",
        "Bucket Sort",
        "bucket sort",
        "Distribute values into buckets, sort each bucket, and concatenate the buckets.",
        """
Implement bucket sort. Return a new integer array containing the same values in ascending order.

Use the value range to distribute numbers into several buckets. Sort the values inside each bucket, then concatenate the buckets from the smallest range to the largest. Do not mutate the caller's input array.
""",
        """
Example 1:
Input: nums = [5,0,2,5,1]
Output: [0,1,2,5,5]

Example 2:
Input: nums = [-3,0,2,-3]
Output: [-3,-3,0,2]
""",
        """
- 0 <= nums.length <= 10000.
- -1000 <= nums[i] <= 1000.
- Duplicate values are allowed.
- Use multiple buckets rather than calling Array.Sort() on the whole input.
- Target average time complexity: O(n + k), where k is the value range.
""",
        """
Sort([5,0,2,5,1]) => [0,1,2,5,5]
Sort([-3,0,2,-3]) => [-3,-3,0,2]
Sort([]) => []
Sort([4]) => [4]
Sort([-1000,1000,0]) => [-1000,0,1000]
Sort([2,2,1,1]) => [1,1,2,2]
The original input array remains unchanged.
""",
        """
Copy nums and find its minimum and maximum. Map each value to a bucket based on its position in that range, sort each bucket with insertion sort, and append the buckets in order.
""",
        ["array", "sorting", "bucket-sort", "distribution"],
        """
public static class Solution
{
    /// <summary>
    /// Sorts values with bucket sort.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>A sorted copy of the input.</returns>
    public static int[] Sort(int[] nums)
    {
        return nums;
    }
}
""",
        """
public static class Solution
{
    /// <summary>
    /// Sorts values with bucket sort.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>A sorted copy of the input.</returns>
    public static int[] Sort(int[] nums)
    {
        if (nums.Length == 0)
        {
            return [];
        }

        var values = nums.ToArray();
        var minimum = values.Min();
        var maximum = values.Max();
        var range = (long)maximum - minimum + 1;
        var bucketCount = Math.Max(1, (int)Math.Sqrt(values.Length));
        var buckets = Enumerable.Range(0, bucketCount)
            .Select(_ => new List<int>())
            .ToArray();

        foreach (var value in values)
        {
            var bucketIndex = (int)(((long)value - minimum) * bucketCount / range);
            bucketIndex = Math.Min(bucketIndex, bucketCount - 1);
            buckets[bucketIndex].Add(value);
        }

        var result = new int[values.Length];
        var writeIndex = 0;

        foreach (var bucket in buckets)
        {
            for (var index = 1; index < bucket.Count; index++)
            {
                var current = bucket[index];
                var previous = index - 1;

                while (previous >= 0 && bucket[previous] > current)
                {
                    bucket[previous + 1] = bucket[previous];
                    previous--;
                }

                bucket[previous + 1] = current;
            }

            foreach (var value in bucket)
            {
                result[writeIndex++] = value;
            }
        }

        return result;
    }
}
""");

    /// <summary>
    /// Gets the radix sort exercise.
    /// </summary>
    public static BasicExerciseResponse RadixSort { get; } = CreateDefinition(
        "radix-sort",
        "Radix Sort",
        "radix sort",
        "Sort integer values digit by digit without comparing the full values directly.",
        """
Implement radix sort. Return a new integer array containing the same values in ascending order.

Process one decimal digit at a time with a stable counting pass. Your implementation must support negative values by handling their magnitudes separately, then combining the negative and non-negative results. Do not mutate the caller's input array.
""",
        """
Example 1:
Input: nums = [170,45,75,90,802,24,2,66]
Output: [2,24,45,66,75,90,170,802]

Example 2:
Input: nums = [-12,5,-3,0,5]
Output: [-12,-3,0,5,5]
""",
        """
- 0 <= nums.length <= 10000.
- -1000000000 <= nums[i] <= 1000000000.
- Duplicate values are allowed.
- Use decimal digit passes; do not call Array.Sort() or LINQ OrderBy().
- Target time complexity: O(d * (n + 10)), where d is the number of digits.
""",
        """
Sort([170,45,75,90,802,24,2,66]) => [2,24,45,66,75,90,170,802]
Sort([-12,5,-3,0,5]) => [-12,-3,0,5,5]
Sort([]) => []
Sort([7]) => [7]
Sort([int.MinValue,0,int.MaxValue]) => [int.MinValue,0,int.MaxValue]
Sort([10,1,10,2]) => [1,2,10,10]
The original input array remains unchanged.
""",
        """
Separate negative magnitudes from non-negative values. Apply stable least-significant-digit counting passes to both arrays, reverse the sorted negative magnitudes while restoring their sign, and append the non-negative values.
""",
        ["array", "sorting", "radix-sort", "counting-sort", "non-comparison"],
        """
public static class Solution
{
    /// <summary>
    /// Sorts values with radix sort.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>A sorted copy of the input.</returns>
    public static int[] Sort(int[] nums)
    {
        return nums;
    }
}
""",
        """
public static class Solution
{
    /// <summary>
    /// Sorts signed integer values with radix sort.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>A sorted copy of the input.</returns>
    public static int[] Sort(int[] nums)
    {
        var negativeMagnitudes = new List<long>();
        var nonNegativeValues = new List<long>();

        foreach (var value in nums)
        {
            if (value < 0)
            {
                negativeMagnitudes.Add(-(long)value);
            }
            else
            {
                nonNegativeValues.Add(value);
            }
        }

        var negatives = RadixSort(negativeMagnitudes.ToArray());
        var positives = RadixSort(nonNegativeValues.ToArray());
        var result = new int[nums.Length];
        var writeIndex = 0;

        for (var index = negatives.Length - 1; index >= 0; index--)
        {
            result[writeIndex++] = (int)-negatives[index];
        }

        foreach (var value in positives)
        {
            result[writeIndex++] = (int)value;
        }

        return result;
    }

    /// <summary>
    /// Sorts non-negative magnitudes with stable decimal digit passes.
    /// </summary>
    /// <param name="values">The non-negative magnitudes.</param>
    /// <returns>The sorted magnitudes.</returns>
    private static long[] RadixSort(long[] values)
    {
        if (values.Length <= 1)
        {
            return values.ToArray();
        }

        var sorted = values.ToArray();
        var maximum = sorted.Max();

        for (long place = 1; place <= maximum; place *= 10)
        {
            var counts = new int[10];
            var output = new long[sorted.Length];

            foreach (var value in sorted)
            {
                counts[(int)(value / place % 10)]++;
            }

            for (var digit = 1; digit < counts.Length; digit++)
            {
                counts[digit] += counts[digit - 1];
            }

            for (var index = sorted.Length - 1; index >= 0; index--)
            {
                var digit = (int)(sorted[index] / place % 10);
                output[--counts[digit]] = sorted[index];
            }

            sorted = output;

            if (place > maximum / 10)
            {
                break;
            }
        }

        return sorted;
    }
}
""");

    /// <summary>
    /// Creates one independent sorting exercise definition.
    /// </summary>
    /// <param name="slug">The stable exercise slug.</param>
    /// <param name="title">The exercise title.</param>
    /// <param name="algorithmName">The human-readable algorithm name.</param>
    /// <param name="instructions">The compact instructions.</param>
    /// <param name="problemStatement">The detailed problem statement.</param>
    /// <param name="examples">The worked examples.</param>
    /// <param name="constraints">The input constraints.</param>
    /// <param name="testCases">The automated test case description.</param>
    /// <param name="approachGuide">The intended approach guide.</param>
    /// <param name="tags">The exercise tags.</param>
    /// <param name="starterCode">The starter code.</param>
    /// <param name="referenceSolution">The reference solution.</param>
    /// <returns>The sorting exercise definition.</returns>
    private static BasicExerciseResponse CreateDefinition(
        string slug,
        string title,
        string algorithmName,
        string instructions,
        string problemStatement,
        string examples,
        string constraints,
        string testCases,
        string approachGuide,
        IReadOnlyCollection<string> tags,
        string starterCode,
        string referenceSolution)
    {
        return BasicExerciseFactory.Create(
            slug,
            title,
            LearningDifficulty.Medium,
            instructions,
            problemStatement,
            examples,
            constraints,
            testCases,
            approachGuide,
            "public static int[] Sort(int[] nums)",
            tags,
            starterCode,
            referenceSolution);
    }
}
