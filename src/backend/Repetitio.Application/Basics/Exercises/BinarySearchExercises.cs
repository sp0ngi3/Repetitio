using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.Basics.Exercises;

/// <summary>
/// Provides built-in Basics exercises for binary search.
/// </summary>
public static class BinarySearchExercises
{
    /// <summary>
    /// Gets the sorted array binary search exercise.
    /// </summary>
    public static BasicExerciseResponse SearchSortedArray { get; } = BasicExerciseFactory.Create(
        "binary-search-sorted-array",
        "Binary Search: Search Sorted Array",
        LearningDifficulty.Easy,
        "Search a sorted array in O(log n) time.",
        """
Given an array of distinct integers sorted in ascending order and an integer target, return the index of target.

Return -1 if target does not exist in nums.
""",
        """
Example 1:
Input: nums = [-1,0,2,4,6,8], target = 4
Output: 3

Example 2:
Input: nums = [-1,0,2,4,6,8], target = 3
Output: -1
""",
        """
- 1 <= nums.length <= 10000.
- -10000 < nums[i], target < 10000.
- All values in nums are unique.
- nums is sorted in ascending order.
- Target time complexity: O(log n).
""",
        """
Search([-1,0,2,4,6,8], 4) => 3
Search([-1,0,2,4,6,8], 3) => -1
Search([1], 1) => 0
Search([1], 2) => -1
Search([1,2], 1) => 0
Search([1,2], 2) => 1
Search([-10,-3,0,5,9], -10) => 0
Search([-10,-3,0,5,9], 9) => 4
Search([2,5,7,11,15], 6) => -1
Search([2,5,7,11,15], 11) => 3
""",
        """
Keep low and high indexes. Compare target with the middle value and discard half of the remaining range each step.
""",
        "public static int Search(int[] nums, int target)",
        ["array", "binary-search", "sorted-array"],
        IntStarter("Search", "int[] nums, int target"),
        """
public static class Solution
{
    /// <summary>
    /// Searches a sorted array for a target value.
    /// </summary>
    /// <param name="nums">The sorted input values.</param>
    /// <param name="target">The target value.</param>
    /// <returns>The target index, or -1 when the target is missing.</returns>
    public static int Search(int[] nums, int target)
    {
        var low = 0;
        var high = nums.Length - 1;

        while (low <= high)
        {
            var middle = low + ((high - low) / 2);

            if (nums[middle] == target)
            {
                return middle;
            }

            if (nums[middle] < target)
            {
                low = middle + 1;
            }
            else
            {
                high = middle - 1;
            }
        }

        return -1;
    }
}
""");

    /// <summary>
    /// Creates an integer-returning starter.
    /// </summary>
    /// <param name="methodName">The method name.</param>
    /// <param name="parameters">The method parameters.</param>
    /// <returns>The starter code.</returns>
    private static string IntStarter(string methodName, string parameters)
    {
        return $$"""
public static class Solution
{
    /// <summary>
    /// Implements the {{methodName}} exercise.
    /// </summary>
    /// <param name="nums">The sorted input values.</param>
    /// <param name="target">The target value.</param>
    /// <returns>The computed index.</returns>
    public static int {{methodName}}({{parameters}})
    {
        return -1;
    }
}
""";
    }
}
