using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.Basics.Exercises;

/// <summary>
/// Provides built-in Basics exercises for common array techniques.
/// </summary>
public static class ArrayTechniqueExercises
{
    /// <summary>
    /// Gets the Kadane maximum subarray range exercise.
    /// </summary>
    public static BasicExerciseResponse KadaneMaxSubarrayRange { get; } = BasicExerciseFactory.Create(
        "kadane-max-subarray-range",
        "Kadane Algorithm: Maximum Subarray Range",
        LearningDifficulty.Easy,
        "Find the start and end indexes of the contiguous subarray with the maximum sum.",
        """
Given a custom dynamic array of integers, return the inclusive start and end indexes of the contiguous subarray with the largest possible sum.

If multiple subarrays have the same maximum sum, keep the earliest one. The input must be validated before the scan begins.
""",
        """
Example 1:
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: [3,6]

Example 2:
Input: nums = [-5,-2,-8]
Output: [1,1]

Example 3:
Input: nums = [7]
Output: [0,0]
""",
        """
- nums must not be null.
- nums must contain at least one value.
- -100000 <= nums[i] <= 100000.
- Target time complexity: O(n).
- Target space complexity: O(1).
""",
        """
FindMaxSubarrayRange([-2,1,-3,4,-1,2,1,-5,4]) => [3,6]
FindMaxSubarrayRange([1,2,3]) => [0,2]
FindMaxSubarrayRange([-5,-2,-8]) => [1,1]
FindMaxSubarrayRange([0,0,0]) => [0,0]
FindMaxSubarrayRange([5,-1,5]) => [0,2]
FindMaxSubarrayRange([-1,5,-2,5,-10]) => [1,3]
FindMaxSubarrayRange([9,-10,8]) => [0,0]
FindMaxSubarrayRange([2,-1,2,-1,2]) => [0,4]
FindMaxSubarrayRange(null) => ArgumentNullException
FindMaxSubarrayRange([]) => ArgumentException
""",
        """
Track the best sum and the current running sum. When the running sum becomes negative, reset it and start a new candidate window at the current index.
""",
        "public static int[] FindMaxSubarrayRange(CustomDynamicArray<int> nums)",
        ["array", "dynamic-array", "kadane", "greedy", "prefix-thinking"],
        """
public sealed class CustomDynamicArray<T>
{
    private readonly T[] items;

    /// <summary>
    /// Initializes a new instance of the <see cref="CustomDynamicArray{T}"/> class.
    /// </summary>
    /// <param name="items">The values stored by the dynamic array.</param>
    public CustomDynamicArray(T[] items)
    {
        this.items = items;
    }

    /// <summary>
    /// Gets the number of stored values.
    /// </summary>
    public int Count => items.Length;

    /// <summary>
    /// Gets the value at the given index.
    /// </summary>
    /// <param name="index">The zero-based index.</param>
    /// <returns>The value at the index.</returns>
    public T Get(int index)
    {
        return items[index];
    }
}

public static class Solution
{
    /// <summary>
    /// Finds the start and end indexes of the contiguous subarray with the maximum sum.
    /// </summary>
    /// <param name="nums">The custom dynamic array of numbers to analyze.</param>
    /// <returns>An array where the first value is the start index and the second value is the end index.</returns>
    public static int[] FindMaxSubarrayRange(CustomDynamicArray<int> nums)
    {
        return [];
    }
}
""",
        """
public sealed class CustomDynamicArray<T>
{
    private readonly T[] items;

    /// <summary>
    /// Initializes a new instance of the <see cref="CustomDynamicArray{T}"/> class.
    /// </summary>
    /// <param name="items">The values stored by the dynamic array.</param>
    public CustomDynamicArray(T[] items)
    {
        this.items = items;
    }

    /// <summary>
    /// Gets the number of stored values.
    /// </summary>
    public int Count => items.Length;

    /// <summary>
    /// Gets the value at the given index.
    /// </summary>
    /// <param name="index">The zero-based index.</param>
    /// <returns>The value at the index.</returns>
    public T Get(int index)
    {
        return items[index];
    }
}

public static class Solution
{
    /// <summary>
    /// Finds the start and end indexes of the contiguous subarray with the maximum sum.
    /// </summary>
    /// <param name="nums">The custom dynamic array of numbers to analyze.</param>
    /// <returns>An array where the first value is the start index and the second value is the end index.</returns>
    public static int[] FindMaxSubarrayRange(CustomDynamicArray<int> nums)
    {
        if (nums is null)
        {
            throw new ArgumentNullException(nameof(nums));
        }

        if (nums.Count == 0)
        {
            throw new ArgumentException("Dynamic array must contain at least one value.", nameof(nums));
        }

        var maxSum = nums.Get(0);
        var currentSum = 0;
        var maxLeft = 0;
        var maxRight = 0;
        var currentLeft = 0;

        for (var right = 0; right < nums.Count; right++)
        {
            if (currentSum < 0)
            {
                currentSum = 0;
                currentLeft = right;
            }

            currentSum += nums.Get(right);

            if (currentSum > maxSum)
            {
                maxSum = currentSum;
                maxLeft = currentLeft;
                maxRight = right;
            }
        }

        return [maxLeft, maxRight];
    }
}
""");

    /// <summary>
    /// Gets the sorted two sum exercise.
    /// </summary>
    public static BasicExerciseResponse TwoSumSorted { get; } = BasicExerciseFactory.Create(
        "two-pointers-two-sum-sorted",
        "Two Pointers: Two Sum Sorted",
        LearningDifficulty.Easy,
        "Return the indexes of two numbers in a sorted array that add up to target.",
        """
Given an integer array sorted in ascending order and a target value, return the zero-based indexes of the two values whose sum equals target.

Each test has at most one valid answer. Return [-1, -1] when no pair exists.
""",
        """
Example 1:
Input: nums = [1,2,4,6,8], target = 10
Output: [1,4]

Example 2:
Input: nums = [1,3,5], target = 20
Output: [-1,-1]
""",
        """
- nums is sorted in ascending order.
- nums may contain negative values and duplicates.
- 0 <= nums.length <= 10000.
- Target time complexity: O(n).
- Target space complexity: O(1).
""",
        """
TwoSumSorted([1,2,4,6,8], 10) => [1,4]
TwoSumSorted([1,3,5], 20) => [-1,-1]
TwoSumSorted([-5,-2,0,7], 2) => [0,3]
TwoSumSorted([2,2,3], 4) => [0,1]
TwoSumSorted([], 1) => [-1,-1]
TwoSumSorted([5], 5) => [-1,-1]
TwoSumSorted([1,4,4], 8) => [1,2]
TwoSumSorted([-3,-1,2,4], 1) => [0,3]
TwoSumSorted([0,1,2,3], 0) => [-1,-1]
TwoSumSorted([-10,-4,-1], -14) => [0,1]
""",
        """
Place one pointer at the beginning and one at the end. Move the left pointer when the sum is too small, and move the right pointer when the sum is too large.
""",
        "public static int[] TwoSumSorted(int[] nums, int target)",
        ["array", "two-pointers", "sorted-array"],
        SimpleArrayStarter("TwoSumSorted", "int[] nums, int target", "return [-1, -1];"),
        """
public static class Solution
{
    /// <summary>
    /// Finds two indexes whose values add up to target in a sorted array.
    /// </summary>
    /// <param name="nums">The sorted input array.</param>
    /// <param name="target">The target sum.</param>
    /// <returns>The matching zero-based indexes, or [-1, -1] when no pair exists.</returns>
    public static int[] TwoSumSorted(int[] nums, int target)
    {
        var left = 0;
        var right = nums.Length - 1;

        while (left < right)
        {
            var sum = nums[left] + nums[right];

            if (sum == target)
            {
                return [left, right];
            }

            if (sum < target)
            {
                left++;
            }
            else
            {
                right--;
            }
        }

        return [-1, -1];
    }
}
""");

    /// <summary>
    /// Gets the prefix sum range query exercise.
    /// </summary>
    public static BasicExerciseResponse PrefixRangeSum { get; } = BasicExerciseFactory.Create(
        "prefix-sum-range-query",
        "Prefix Sum: Range Query",
        LearningDifficulty.Easy,
        "Return the sum of values between two inclusive indexes.",
        """
Given an integer array and two inclusive indexes left and right, return the sum of nums[left] through nums[right].

The direct version is acceptable for one query, but the intended practice is to build a prefix sum array and answer the range in O(1) after preprocessing.
""",
        """
Example 1:
Input: nums = [2,-1,3,5], left = 1, right = 3
Output: 7

Example 2:
Input: nums = [10], left = 0, right = 0
Output: 10
""",
        """
- 1 <= nums.length <= 10000.
- 0 <= left <= right < nums.length.
- Values may be negative.
- Target time complexity: O(n) preprocessing and O(1) query.
""",
        """
RangeSum([2,-1,3,5], 1, 3) => 7
RangeSum([10], 0, 0) => 10
RangeSum([-2,-3,-4], 0, 2) => -9
RangeSum([1,2,3,4], 0, 3) => 10
RangeSum([1,2,3,4], 2, 2) => 3
RangeSum([5,0,0,5], 1, 2) => 0
RangeSum([100,-50,25], 0, 1) => 50
RangeSum([3,3,3], 1, 2) => 6
RangeSum([-1,1,-1,1], 0, 3) => 0
RangeSum([8,2,-5,4], 2, 3) => -1
""",
        """
Build prefix[i + 1] as the sum of all numbers before index i + 1. Then the answer is prefix[right + 1] - prefix[left].
""",
        "public static int RangeSum(int[] nums, int left, int right)",
        ["array", "prefix-sum", "range-query"],
        SimpleIntStarter("RangeSum", "int[] nums, int left, int right"),
        """
public static class Solution
{
    /// <summary>
    /// Returns the sum of an inclusive array range.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <param name="left">The inclusive left index.</param>
    /// <param name="right">The inclusive right index.</param>
    /// <returns>The range sum.</returns>
    public static int RangeSum(int[] nums, int left, int right)
    {
        var prefix = new int[nums.Length + 1];

        for (var index = 0; index < nums.Length; index++)
        {
            prefix[index + 1] = prefix[index] + nums[index];
        }

        return prefix[right + 1] - prefix[left];
    }
}
""");

    /// <summary>
    /// Gets the pivot index prefix sum exercise.
    /// </summary>
    public static BasicExerciseResponse PivotIndex { get; } = BasicExerciseFactory.Create(
        "prefix-sum-pivot-index",
        "Prefix Sum: Pivot Index",
        LearningDifficulty.Easy,
        "Find an index where the sum on the left equals the sum on the right.",
        """
Given an integer array, return the leftmost pivot index. A pivot index is an index where the sum of all values to its left equals the sum of all values to its right.

Return -1 if no such index exists.
""",
        """
Example 1:
Input: nums = [1,7,3,6,5,6]
Output: 3

Example 2:
Input: nums = [1,2,3]
Output: -1
""",
        """
- 0 <= nums.length <= 10000.
- Values may be negative.
- Empty input returns -1.
- Target time complexity: O(n).
- Target space complexity: O(1).
""",
        """
PivotIndex([1,7,3,6,5,6]) => 3
PivotIndex([1,2,3]) => -1
PivotIndex([2,1,-1]) => 0
PivotIndex([0,0,0]) => 0
PivotIndex([]) => -1
PivotIndex([5]) => 0
PivotIndex([-1,-1,-1,0,1,1]) => 0
PivotIndex([1,-1,0]) => 2
PivotIndex([3,4,8,-9,20,6]) => 4
PivotIndex([10,-10,10]) => 0
""",
        """
Compute the total sum once. Walk from left to right while maintaining leftSum. The right side is total - leftSum - nums[index].
""",
        "public static int PivotIndex(int[] nums)",
        ["array", "prefix-sum", "equilibrium-index"],
        SimpleIntStarter("PivotIndex", "int[] nums"),
        """
public static class Solution
{
    /// <summary>
    /// Finds the leftmost pivot index.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>The pivot index, or -1 when none exists.</returns>
    public static int PivotIndex(int[] nums)
    {
        var total = nums.Sum();
        var leftSum = 0;

        for (var index = 0; index < nums.Length; index++)
        {
            var rightSum = total - leftSum - nums[index];

            if (leftSum == rightSum)
            {
                return index;
            }

            leftSum += nums[index];
        }

        return -1;
    }
}
""");

    /// <summary>
    /// Gets the maximum average sliding window exercise.
    /// </summary>
    public static BasicExerciseResponse MaxAverageSubarray { get; } = BasicExerciseFactory.Create(
        "sliding-window-max-average",
        "Sliding Window: Maximum Average",
        LearningDifficulty.Easy,
        "Find the maximum average value among all contiguous windows of size k.",
        """
Given an integer array and a window size k, return the maximum average of any contiguous subarray of length k.

The answer can be returned as a double.
""",
        """
Example 1:
Input: nums = [1,12,-5,-6,50,3], k = 4
Output: 12.75

Example 2:
Input: nums = [5], k = 1
Output: 5
""",
        """
- 1 <= k <= nums.length.
- 1 <= nums.length <= 10000.
- Values may be negative.
- Target time complexity: O(n).
- Target space complexity: O(1).
""",
        """
FindMaxAverage([1,12,-5,-6,50,3], 4) => 12.75
FindMaxAverage([5], 1) => 5
FindMaxAverage([0,0,0], 2) => 0
FindMaxAverage([-1,-12,-5], 2) => -6.5
FindMaxAverage([4,2,1,3,3], 2) => 3
FindMaxAverage([9,7,3,5], 4) => 6
FindMaxAverage([100,-100,100], 1) => 100
FindMaxAverage([2,2,2,2], 3) => 2
FindMaxAverage([-5,10,-5,10], 2) => 2.5
FindMaxAverage([1,2,3,4,5], 5) => 3
""",
        """
Sum the first k values. Then slide the window one step at a time by adding the entering value and subtracting the leaving value.
""",
        "public static double FindMaxAverage(int[] nums, int k)",
        ["array", "sliding-window", "fixed-window"],
        SimpleDoubleStarter("FindMaxAverage", "int[] nums, int k"),
        """
public static class Solution
{
    /// <summary>
    /// Finds the maximum average among all windows of size k.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <param name="k">The fixed window size.</param>
    /// <returns>The maximum average value.</returns>
    public static double FindMaxAverage(int[] nums, int k)
    {
        var windowSum = 0;

        for (var index = 0; index < k; index++)
        {
            windowSum += nums[index];
        }

        var bestSum = windowSum;

        for (var right = k; right < nums.Length; right++)
        {
            windowSum += nums[right] - nums[right - k];
            bestSum = Math.Max(bestSum, windowSum);
        }

        return (double)bestSum / k;
    }
}
""");

    /// <summary>
    /// Gets the minimum size subarray sum sliding window exercise.
    /// </summary>
    public static BasicExerciseResponse MinimumSizeSubarraySum { get; } = BasicExerciseFactory.Create(
        "sliding-window-min-size-subarray-sum",
        "Sliding Window: Minimum Size Subarray Sum",
        LearningDifficulty.Medium,
        "Find the smallest contiguous window with sum at least target.",
        """
Given an array of positive integers and a positive target, return the minimal length of a contiguous subarray whose sum is greater than or equal to target.

Return 0 if no such subarray exists.
""",
        """
Example 1:
Input: target = 7, nums = [2,3,1,2,4,3]
Output: 2

Example 2:
Input: target = 11, nums = [1,1,1,1]
Output: 0
""",
        """
- nums contains positive integers.
- 1 <= nums.length <= 10000.
- 1 <= target <= 100000.
- Target time complexity: O(n).
- Target space complexity: O(1).
""",
        """
MinSubArrayLen(7, [2,3,1,2,4,3]) => 2
MinSubArrayLen(4, [1,4,4]) => 1
MinSubArrayLen(11, [1,1,1,1]) => 0
MinSubArrayLen(15, [1,2,3,4,5]) => 5
MinSubArrayLen(5, [5]) => 1
MinSubArrayLen(6, [5]) => 0
MinSubArrayLen(3, [1,1,1]) => 3
MinSubArrayLen(8, [2,3,1,2,4,3]) => 3
MinSubArrayLen(100, [50,50]) => 2
MinSubArrayLen(9, [1,2,3,4,5]) => 2
""",
        """
Expand the right edge to increase the sum. While the sum is large enough, update the answer and shrink the left edge.
""",
        "public static int MinSubArrayLen(int target, int[] nums)",
        ["array", "sliding-window", "variable-window"],
        SimpleIntStarter("MinSubArrayLen", "int target, int[] nums"),
        """
public static class Solution
{
    /// <summary>
    /// Finds the minimum length of a subarray whose sum is at least target.
    /// </summary>
    /// <param name="target">The required minimum sum.</param>
    /// <param name="nums">The positive input values.</param>
    /// <returns>The minimum subarray length, or 0 when no valid subarray exists.</returns>
    public static int MinSubArrayLen(int target, int[] nums)
    {
        var left = 0;
        var sum = 0;
        var best = int.MaxValue;

        for (var right = 0; right < nums.Length; right++)
        {
            sum += nums[right];

            while (sum >= target)
            {
                best = Math.Min(best, right - left + 1);
                sum -= nums[left];
                left++;
            }
        }

        return best == int.MaxValue ? 0 : best;
    }
}
""");

    /// <summary>
    /// Creates a simple int array starter.
    /// </summary>
    /// <param name="methodName">The method name.</param>
    /// <param name="parameters">The method parameters.</param>
    /// <param name="returnStatement">The default return statement.</param>
    /// <returns>The starter code.</returns>
    private static string SimpleArrayStarter(string methodName, string parameters, string returnStatement)
    {
        return $$"""
public static class Solution
{
    /// <summary>
    /// Implement the {{methodName}} exercise.
    /// </summary>
    /// <returns>The computed result.</returns>
    public static int[] {{methodName}}({{parameters}})
    {
        {{returnStatement}}
    }
}
""";
    }

    /// <summary>
    /// Creates a simple integer starter.
    /// </summary>
    /// <param name="methodName">The method name.</param>
    /// <param name="parameters">The method parameters.</param>
    /// <returns>The starter code.</returns>
    private static string SimpleIntStarter(string methodName, string parameters)
    {
        return $$"""
public static class Solution
{
    /// <summary>
    /// Implement the {{methodName}} exercise.
    /// </summary>
    /// <returns>The computed integer result.</returns>
    public static int {{methodName}}({{parameters}})
    {
        return 0;
    }
}
""";
    }

    /// <summary>
    /// Creates a simple double starter.
    /// </summary>
    /// <param name="methodName">The method name.</param>
    /// <param name="parameters">The method parameters.</param>
    /// <returns>The starter code.</returns>
    private static string SimpleDoubleStarter(string methodName, string parameters)
    {
        return $$"""
public static class Solution
{
    /// <summary>
    /// Implement the {{methodName}} exercise.
    /// </summary>
    /// <returns>The computed floating-point result.</returns>
    public static double {{methodName}}({{parameters}})
    {
        return 0;
    }
}
""";
    }
}
