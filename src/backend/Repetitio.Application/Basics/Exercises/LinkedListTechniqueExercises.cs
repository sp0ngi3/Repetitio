using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.Basics.Exercises;

/// <summary>
/// Provides built-in Basics exercises for linked list techniques.
/// </summary>
public static class LinkedListTechniqueExercises
{
    /// <summary>
    /// Gets the linked list operations exercise.
    /// </summary>
    public static BasicExerciseResponse LinkedListOperations { get; } = BasicExerciseFactory.Create(
        "linked-list-operations",
        "Linked List: Insert And Get",
        LearningDifficulty.Easy,
        "Implement basic linked list insertion and indexed lookup operations.",
        """
Implement four basic operations for a singly linked list:

- InsertAtHead
- InsertAtEnd
- InsertAtIndex
- GetByIndex

Indexes are zero-based. InsertAtIndex should leave the list unchanged when the index is invalid.
""",
        """
Example 1:
Input: head = 2 -> 3, InsertAtHead(head, 1)
Output: 1 -> 2 -> 3

Example 2:
Input: head = 1 -> 3, InsertAtIndex(head, 1, 2)
Output: 1 -> 2 -> 3

Example 3:
Input: head = 1 -> 2, GetByIndex(head, 1)
Output: 2
""",
        """
- The list may be empty.
- Indexes are zero-based.
- Invalid get indexes return null.
- Invalid insert indexes leave the list unchanged.
- Target time complexity: O(n) for end/index operations and O(1) for head insertion.
""",
        """
InsertAtHead([], 1) => 1
InsertAtHead([2,3], 1) => [1,2,3]
InsertAtEnd([], 1) => [1]
InsertAtEnd([1,2], 3) => [1,2,3]
InsertAtIndex([1,3], 1, 2) => [1,2,3]
InsertAtIndex([2,3], 0, 1) => [1,2,3]
InsertAtIndex([1,2], 2, 3) => [1,2,3]
InsertAtIndex([1,2], 5, 9) => [1,2]
GetByIndex([4,5,6], 2) => 6
GetByIndex([4,5,6], 3) => null
""",
        """
Use a tiny ListNode model and carefully handle empty-list and index-zero cases before walking the list.
""",
        """
public static ListNode InsertAtHead(ListNode? head, int value)
public static ListNode InsertAtEnd(ListNode? head, int value)
public static ListNode? InsertAtIndex(ListNode? head, int index, int value)
public static int? GetByIndex(ListNode? head, int index)
""",
        ["linked-list", "insertion", "indexing", "pointers"],
        LinkedListStarter(),
        LinkedListReferenceSolution());

    /// <summary>
    /// Gets the duplicate number fast and slow pointer exercise.
    /// </summary>
    public static BasicExerciseResponse FindDuplicateNumber { get; } = BasicExerciseFactory.Create(
        "fast-slow-find-duplicate-number",
        "Fast And Slow Pointers: Find Duplicate Number",
        LearningDifficulty.Medium,
        "Find the duplicate value in an array by treating indexes as links.",
        """
Given an array nums containing n + 1 integers where each value is in the range [1, n], return the duplicated number.

Solve it without modifying nums and using only constant extra space.
""",
        """
Example 1:
Input: nums = [1,3,4,2,2]
Output: 2

Example 2:
Input: nums = [3,1,3,4,2]
Output: 3
""",
        """
- nums.length == n + 1.
- 1 <= nums[i] <= n.
- Exactly one value is duplicated, but it may appear more than twice.
- Target time complexity: O(n).
- Target space complexity: O(1).
""",
        """
FindDuplicate([1,3,4,2,2]) => 2
FindDuplicate([3,1,3,4,2]) => 3
FindDuplicate([1,1]) => 1
FindDuplicate([1,1,2]) => 1
FindDuplicate([2,2,2,2,2]) => 2
FindDuplicate([2,5,9,6,9,3,8,9,7,1]) => 9
FindDuplicate([4,3,1,4,2]) => 4
FindDuplicate([1,4,6,2,6,3,5]) => 6
FindDuplicate([5,4,3,2,1,5]) => 5
FindDuplicate([2,1,2]) => 2
""",
        """
Use Floyd's cycle detection. Treat nums[i] as the next pointer. First find the meeting point, then reset one pointer to index 0 and move both one step until they meet at the duplicate value.
""",
        "public static int FindDuplicate(int[] nums)",
        ["array", "fast-slow-pointers", "cycle-detection", "floyd"],
        """
public static class Solution
{
    /// <summary>
    /// Finds the duplicate number without modifying the input.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>The duplicate number.</returns>
    public static int FindDuplicate(int[] nums)
    {
        return 0;
    }
}
""",
        """
public static class Solution
{
    /// <summary>
    /// Finds the duplicate number without modifying the input.
    /// </summary>
    /// <param name="nums">The input values.</param>
    /// <returns>The duplicate number.</returns>
    public static int FindDuplicate(int[] nums)
    {
        var slow = nums[0];
        var fast = nums[0];

        do
        {
            slow = nums[slow];
            fast = nums[nums[fast]];
        }
        while (slow != fast);

        slow = nums[0];

        while (slow != fast)
        {
            slow = nums[slow];
            fast = nums[fast];
        }

        return slow;
    }
}
""");

    /// <summary>
    /// Creates starter code for linked list operations.
    /// </summary>
    /// <returns>The starter code.</returns>
    private static string LinkedListStarter()
    {
        return """
public sealed class ListNode
{
    /// <summary>
    /// Gets or sets the node value.
    /// </summary>
    public int Value { get; set; }

    /// <summary>
    /// Gets or sets the next node.
    /// </summary>
    public ListNode? Next { get; set; }
}

public static class Solution
{
    /// <summary>
    /// Inserts a value at the beginning of the list.
    /// </summary>
    /// <param name="head">The current list head.</param>
    /// <param name="value">The value to insert.</param>
    /// <returns>The new list head.</returns>
    public static ListNode InsertAtHead(ListNode? head, int value)
    {
        return new ListNode { Value = value, Next = head };
    }

    /// <summary>
    /// Inserts a value at the end of the list.
    /// </summary>
    /// <param name="head">The current list head.</param>
    /// <param name="value">The value to insert.</param>
    /// <returns>The list head.</returns>
    public static ListNode InsertAtEnd(ListNode? head, int value)
    {
        return new ListNode { Value = value };
    }

    /// <summary>
    /// Inserts a value at a zero-based index.
    /// </summary>
    /// <param name="head">The current list head.</param>
    /// <param name="index">The insertion index.</param>
    /// <param name="value">The value to insert.</param>
    /// <returns>The list head after insertion.</returns>
    public static ListNode? InsertAtIndex(ListNode? head, int index, int value)
    {
        return head;
    }

    /// <summary>
    /// Gets the value at a zero-based index.
    /// </summary>
    /// <param name="head">The current list head.</param>
    /// <param name="index">The lookup index.</param>
    /// <returns>The value at the index, or null when the index is invalid.</returns>
    public static int? GetByIndex(ListNode? head, int index)
    {
        return null;
    }
}
""";
    }

    /// <summary>
    /// Creates reference code for linked list operations.
    /// </summary>
    /// <returns>The reference solution.</returns>
    private static string LinkedListReferenceSolution()
    {
        return """
public sealed class ListNode
{
    /// <summary>
    /// Gets or sets the node value.
    /// </summary>
    public int Value { get; set; }

    /// <summary>
    /// Gets or sets the next node.
    /// </summary>
    public ListNode? Next { get; set; }
}

public static class Solution
{
    /// <summary>
    /// Inserts a value at the beginning of the list.
    /// </summary>
    /// <param name="head">The current list head.</param>
    /// <param name="value">The value to insert.</param>
    /// <returns>The new list head.</returns>
    public static ListNode InsertAtHead(ListNode? head, int value)
    {
        return new ListNode { Value = value, Next = head };
    }

    /// <summary>
    /// Inserts a value at the end of the list.
    /// </summary>
    /// <param name="head">The current list head.</param>
    /// <param name="value">The value to insert.</param>
    /// <returns>The list head.</returns>
    public static ListNode InsertAtEnd(ListNode? head, int value)
    {
        var node = new ListNode { Value = value };

        if (head is null)
        {
            return node;
        }

        var current = head;

        while (current.Next is not null)
        {
            current = current.Next;
        }

        current.Next = node;
        return head;
    }

    /// <summary>
    /// Inserts a value at a zero-based index.
    /// </summary>
    /// <param name="head">The current list head.</param>
    /// <param name="index">The insertion index.</param>
    /// <param name="value">The value to insert.</param>
    /// <returns>The list head after insertion.</returns>
    public static ListNode? InsertAtIndex(ListNode? head, int index, int value)
    {
        if (index < 0)
        {
            return head;
        }

        if (index == 0)
        {
            return InsertAtHead(head, value);
        }

        var current = head;

        for (var position = 0; position < index - 1 && current is not null; position++)
        {
            current = current.Next;
        }

        if (current is null)
        {
            return head;
        }

        current.Next = new ListNode { Value = value, Next = current.Next };
        return head;
    }

    /// <summary>
    /// Gets the value at a zero-based index.
    /// </summary>
    /// <param name="head">The current list head.</param>
    /// <param name="index">The lookup index.</param>
    /// <returns>The value at the index, or null when the index is invalid.</returns>
    public static int? GetByIndex(ListNode? head, int index)
    {
        if (index < 0)
        {
            return null;
        }

        var current = head;

        for (var position = 0; position < index && current is not null; position++)
        {
            current = current.Next;
        }

        return current?.Value;
    }
}
""";
    }
}
