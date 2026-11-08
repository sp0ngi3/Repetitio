using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.Basics.Exercises;

/// <summary>
/// Provides built-in Basics exercises for common array techniques.
/// </summary>
public static class ArrayTechniqueExercises
{
    /// <summary>
    /// Gets the Kadane's algorithm maximum subarray exercise.
    /// </summary>
    public static BasicExerciseResponse KadaneMaximumSubarray { get; } = BasicExerciseFactory.Create(
        "kadane-maximum-subarray",
        "Kadane's Algorithm: Maximum Subarray",
        LearningDifficulty.Medium,
        "Use Kadane's algorithm to find the largest contiguous subarray sum.",
        """
Given an integer array nums, return the largest sum of any non-empty contiguous subarray.

This exercise is specifically about Kadane's algorithm: while scanning from left to right, decide whether the current value should extend the running subarray or start a new one, and keep the best sum seen so far.
""",
        """
Example 1:
Input: nums = [2,-3,4,-2,2,1,-1,4]
Output: 8
Explanation: The subarray [4,-2,2,1,-1,4] has the largest sum.

Example 2:
Input: nums = [-1]
Output: -1
""",
        """
- 1 <= nums.length <= 100000.
- -10000 <= nums[i] <= 10000.
- The subarray must be contiguous.
- The subarray must contain at least one value.
- Target time complexity: O(n).
- Target extra space complexity: O(1).
""",
        """
MaxSubArray([2,-3,4,-2,2,1,-1,4]) => 8
MaxSubArray([-1]) => -1
MaxSubArray([-5,-2,-8]) => -2
MaxSubArray([1,2,3,4]) => 10
MaxSubArray([5,-10,6]) => 6
MaxSubArray([0,0,0]) => 0
MaxSubArray([-2,1,-3,4,-1,2,1,-5,4]) => 6
MaxSubArray([100,-1,-2,50]) => 147
""",
        """
Track currentSum for the best subarray ending at the current index and maxSum for the best answer overall. If currentSum becomes negative, starting fresh at the next value is better than carrying that loss forward.
""",
        "public static int MaxSubArray(int[] nums)",
        ["array", "dynamic-programming", "kadane", "maximum-subarray"],
        """
public static class Solution
{
    /// <summary>
    /// Finds the largest contiguous subarray sum with Kadane's algorithm.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>The largest non-empty contiguous subarray sum.</returns>
    public static int MaxSubArray(int[] nums)
    {
        return 0;
    }
}
""",
        """
public static class Solution
{
    /// <summary>
    /// Finds the largest contiguous subarray sum with Kadane's algorithm.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>The largest non-empty contiguous subarray sum.</returns>
    public static int MaxSubArray(int[] nums)
    {
        var maxSum = nums[0];
        var currentSum = 0;

        foreach (var value in nums)
        {
            currentSum = Math.Max(currentSum, 0);
            currentSum += value;
            maxSum = Math.Max(maxSum, currentSum);
        }

        return maxSum;
    }
}
""");

    public static BasicExerciseResponse MaximumWindowSum { get; } = BasicExerciseFactory.Create(
        "sliding-window-maximum-sum",
        "Sliding Window: Maximum Sum of K Elements",
        LearningDifficulty.Easy,
        "Find the largest sum of exactly k consecutive elements.",
        "Given an integer array nums and a positive integer k, return the maximum sum of any contiguous subarray of length k.",
        """
Input: nums = [2, 1, 5, 1, 3, 2], k = 3
Output: 9
Explanation: The window [5, 1, 3] has the largest sum.

Input: nums = [-4, -2, -7], k = 2
Output: -6
""",
        """
- 1 <= k <= nums.Length <= 100000.
- -10000 <= nums[i] <= 10000.
- Aim for O(n) time and O(1) extra space.
""",
        """
MaxWindowSum([2, 1, 5, 1, 3, 2], 3) => 9
MaxWindowSum([-4, -2, -7], 2) => -6
MaxWindowSum([3, -2, 8], 1) => 8
MaxWindowSum([3, -2, 8], 3) => 9
MaxWindowSum([0, 0, 0], 2) => 0
MaxWindowSum([7], 1) => 7
""",
        "Sum the first k values. Slide one position at a time, subtracting the value that leaves and adding the value that enters. Start the best sum at the first window so negative windows work too.",
        "public static int MaxWindowSum(int[] nums, int k)",
        ["array", "sliding-window"],
        """
public static class Solution
{
    public static int MaxWindowSum(int[] nums, int k)
    {
        return 0;
    }
}
""",
        """
public static class Solution
{
    public static int MaxWindowSum(int[] nums, int k)
    {
        int windowSum = 0;
        for (int i = 0; i < k; i++)
            windowSum += nums[i];

        int best = windowSum;
        for (int right = k; right < nums.Length; right++)
        {
            windowSum += nums[right] - nums[right - k];
            best = Math.Max(best, windowSum);
        }

        return best;
    }
}
""");

    public static BasicExerciseResponse MoveZeroes { get; } = BasicExerciseFactory.Create(
        "two-pointers-move-zeroes",
        "Two Pointers: Move Zeroes",
        LearningDifficulty.Easy,
        "Move all zeroes to the end of the same array.",
        "Modify nums in place so all zeroes appear at the end and the nonzero values keep their original relative order.",
        """
Input: nums = [0, 1, 0, 3, 12]
Output: nums = [1, 3, 12, 0, 0]

Input: nums = [0, -2, 0, -2]
Output: nums = [-2, -2, 0, 0]
""",
        """
- 1 <= nums.Length <= 100000.
- nums can contain any 32-bit integer.
- Modify the given array in place.
- Aim for O(n) time and O(1) extra space.
""",
        """
[0, 1, 0, 3, 12] => [1, 3, 12, 0, 0]
[0, -2, 0, -2] => [-2, -2, 0, 0]
[1, 2, 3] => [1, 2, 3]
[0, 0] => [0, 0]
[0] => [0]
[5, 0, 4, 0, 3] => [5, 4, 3, 0, 0]
""",
        "Use a read pointer to scan the array and a write pointer to mark the next free slot. Copy each nonzero value to that slot, then fill the remaining slots with zeroes.",
        "public static void MoveZeroes(int[] nums)",
        ["array", "two-pointers", "in-place"],
        """
public static class Solution
{
    public static void MoveZeroes(int[] nums)
    {
    }
}
""",
        """
public static class Solution
{
    public static void MoveZeroes(int[] nums)
    {
        int write = 0;
        for (int read = 0; read < nums.Length; read++)
        {
            if (nums[read] != 0)
                nums[write++] = nums[read];
        }

        while (write < nums.Length)
            nums[write++] = 0;
    }
}
""");

    public static BasicExerciseResponse RangeSumQueries { get; } = BasicExerciseFactory.Create(
        "prefix-sums-batch-range-queries",
        "Prefix Sums: Range Sum Queries",
        LearningDifficulty.Easy,
        "Answer multiple inclusive sum queries over the same array.",
        "Given an integer array nums and a list of queries, return one sum per query in the original query order. Each query is a pair [left, right] of zero-based indices, and both endpoints are included.",
        """
Input: nums = [2, -1, 4, 3], queries = [[0, 2], [1, 3], [2, 2]]
Output: [5, 6, 4]

Input: nums = [-3, 1, -2], queries = [[0, 2], [0, 0]]
Output: [-4, -3]
""",
        """
- 1 <= nums.Length <= 100000 and -10000 <= nums[i] <= 10000.
- 0 <= queries.Length <= 100000.
- 0 <= left <= right < nums.Length for every query.
- Aim for O(n + q) time and O(n) extra space excluding the result.
""",
        """
SumRanges([2, -1, 4, 3], [[0, 2], [1, 3], [2, 2]]) => [5, 6, 4]
SumRanges([-3, 1, -2], [[0, 2], [0, 0]]) => [-4, -3]
SumRanges([7], [[0, 0], [0, 0]]) => [7, 7]
SumRanges([1, 2, 3], []) => []
SumRanges([1, 2, 3], [[2, 2], [0, 2], [0, 1]]) => [3, 6, 3]
""",
        "Build prefix with an initial zero. prefix[i] is the sum of the first i elements. An inclusive query [left, right] is prefix[right + 1] minus prefix[left].",
        "public static int[] SumRanges(int[] nums, int[][] queries)",
        ["array", "prefix-sum"],
        """
public static class Solution
{
    public static int[] SumRanges(int[] nums, int[][] queries)
    {
        return [];
    }
}
""",
        """
public static class Solution
{
    public static int[] SumRanges(int[] nums, int[][] queries)
    {
        var prefix = new int[nums.Length + 1];
        for (int i = 0; i < nums.Length; i++)
            prefix[i + 1] = prefix[i] + nums[i];

        var sums = new int[queries.Length];
        for (int i = 0; i < queries.Length; i++)
        {
            int left = queries[i][0];
            int right = queries[i][1];
            sums[i] = prefix[right + 1] - prefix[left];
        }

        return sums;
    }
}
""");

    /// <summary>
    /// Gets the two-pointer two-sum exercise for sorted arrays.
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
    /// Creates a simple integer-array starter.
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
    /// Implements the {{methodName}} exercise.
    /// </summary>
    /// <param name="nums">The sorted input values.</param>
    /// <param name="target">The target sum.</param>
    /// <returns>The computed indexes.</returns>
    public static int[] {{methodName}}({{parameters}})
    {
        {{returnStatement}}
    }
}
""";
    }
}
