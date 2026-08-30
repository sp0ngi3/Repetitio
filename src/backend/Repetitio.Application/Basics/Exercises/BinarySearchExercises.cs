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
    /// Gets the binary search on answer exercise.
    /// </summary>
    public static BasicExerciseResponse FirstPassingVersion { get; } = BasicExerciseFactory.Create(
        "binary-search-first-passing-version",
        "Binary Search Range: First Passing Version",
        LearningDifficulty.Medium,
        "Find the first value in a range for which a monotonic check becomes true.",
        """
You are given a search range from 1 to n and a hidden first passing version.

Implement FirstPassingVersion so that it returns the smallest version x where IsPassing(x) is true. The check is monotonic: once a version passes, every larger version also passes.
""",
        """
Example 1:
Input: n = 10, firstPassing = 6
Output: 6

Example 2:
Input: n = 1, firstPassing = 1
Output: 1
""",
        """
- 1 <= firstPassing <= n <= 1000000.
- IsPassing is monotonic.
- Target time complexity: O(log n).
- Target space complexity: O(1).
""",
        """
FirstPassingVersion(10) with firstPassing 6 => 6
FirstPassingVersion(1) with firstPassing 1 => 1
FirstPassingVersion(2) with firstPassing 1 => 1
FirstPassingVersion(2) with firstPassing 2 => 2
FirstPassingVersion(100) with firstPassing 50 => 50
FirstPassingVersion(100) with firstPassing 100 => 100
FirstPassingVersion(999) with firstPassing 321 => 321
FirstPassingVersion(1000000) with firstPassing 999999 => 999999
FirstPassingVersion(77) with firstPassing 7 => 7
FirstPassingVersion(500) with firstPassing 250 => 250
""",
        """
When middle passes, keep it as a candidate and move left. When it fails, move right.
""",
        "public static int FirstPassingVersion(int n)",
        ["binary-search", "search-space", "monotonic-predicate"],
        """
public static class Solution
{
    /// <summary>
    /// Finds the first passing version.
    /// </summary>
    /// <param name="n">The highest version number.</param>
    /// <returns>The first passing version.</returns>
    public static int FirstPassingVersion(int n)
    {
        return 0;
    }

    /// <summary>
    /// Returns whether a version passes.
    /// </summary>
    /// <param name="version">The version to check.</param>
    /// <returns>True when the version passes; otherwise false.</returns>
    public static bool IsPassing(int version)
    {
        return RepetitioVersionApi.IsPassing(version);
    }
}
""",
        """
public static class Solution
{
    /// <summary>
    /// Finds the first passing version.
    /// </summary>
    /// <param name="n">The highest version number.</param>
    /// <returns>The first passing version.</returns>
    public static int FirstPassingVersion(int n)
    {
        var low = 1;
        var high = n;
        var answer = n;

        while (low <= high)
        {
            var middle = low + ((high - low) / 2);

            if (IsPassing(middle))
            {
                answer = middle;
                high = middle - 1;
            }
            else
            {
                low = middle + 1;
            }
        }

        return answer;
    }

    /// <summary>
    /// Returns whether a version passes.
    /// </summary>
    /// <param name="version">The version to check.</param>
    /// <returns>True when the version passes; otherwise false.</returns>
    public static bool IsPassing(int version)
    {
        return RepetitioVersionApi.IsPassing(version);
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
    /// Implement the {{methodName}} exercise.
    /// </summary>
    /// <returns>The computed integer result.</returns>
    public static int {{methodName}}({{parameters}})
    {
        return -1;
    }
}
""";
    }
}
