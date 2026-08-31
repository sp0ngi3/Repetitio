using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.Basics.Exercises;

/// <summary>
/// Provides built-in Basics exercises for common array techniques.
/// </summary>
public static class ArrayTechniqueExercises
{
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
