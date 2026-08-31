using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.Basics.Exercises;

/// <summary>
/// Provides built-in Basics exercises for linked list techniques.
/// </summary>
public static class LinkedListTechniqueExercises
{
    /// <summary>
    /// Gets the linked list insertion exercise.
    /// </summary>
    public static BasicExerciseResponse LinkedListInsert { get; } = BasicExerciseFactory.Create(
        "linked-list-insert",
        "Linked List: Insert",
        LearningDifficulty.Easy,
        "Implement insertion at the head, tail, and a zero-based index.",
        """
Implement three insertion operations for a singly linked list:

- InsertAtHead
- InsertAtEnd
- InsertAtIndex

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
Input: head = 1 -> 2, InsertAtEnd(head, 3)
Output: 1 -> 2 -> 3
""",
        """
- The list may be empty.
- Indexes are zero-based.
- InsertAtHead always returns a non-null head.
- InsertAtEnd always returns a non-null head.
- Invalid insert indexes leave the list unchanged.
- Target time complexity: O(n) for end/index operations and O(1) for head insertion.
""",
        """
InsertAtHead([], 1) => [1]
InsertAtHead([2,3], 1) => [1,2,3]
InsertAtEnd([], 1) => [1]
InsertAtEnd([1,2], 3) => [1,2,3]
InsertAtIndex([1,3], 1, 2) => [1,2,3]
InsertAtIndex([2,3], 0, 1) => [1,2,3]
InsertAtIndex([1,2], 2, 3) => [1,2,3]
InsertAtIndex([1,2], 5, 9) => [1,2]
InsertAtIndex([1,2], -1, 9) => [1,2]
""",
        """
Handle index zero as a special case. For the other operations, walk the list while keeping the node before the insertion point, then connect the new node without losing the remaining list.
""",
        """
public static ListNode InsertAtHead(ListNode? head, int value)
public static ListNode InsertAtEnd(ListNode? head, int value)
public static ListNode? InsertAtIndex(ListNode? head, int index, int value)
""",
        ["linked-list", "insertion", "pointers"],
        LinkedListInsertStarter(),
        LinkedListInsertReference());

    /// <summary>
    /// Gets the linked list indexed lookup exercise.
    /// </summary>
    public static BasicExerciseResponse LinkedListGet { get; } = BasicExerciseFactory.Create(
        "linked-list-get",
        "Linked List: Get",
        LearningDifficulty.Easy,
        "Return the value stored at a zero-based linked list index.",
        """
Implement indexed lookup for a singly linked list. Return the value at the requested zero-based index, or null when the index is outside the list.

The list may be empty and indexes may be negative. Walk the list one node at a time; do not convert it to an array.
""",
        """
Example 1:
Input: head = 4 -> 5 -> 6, index = 2
Output: 6

Example 2:
Input: head = 4 -> 5 -> 6, index = 3
Output: null
""",
        """
- The list may be empty.
- Indexes are zero-based.
- Negative or out-of-range indexes return null.
- Node values may be negative or zero.
- Target time complexity: O(n).
- Target extra space complexity: O(1).
""",
        """
GetByIndex([4,5,6], 0) => 4
GetByIndex([4,5,6], 2) => 6
GetByIndex([4,5,6], 3) => null
GetByIndex([], 0) => null
GetByIndex([7], -1) => null
GetByIndex([0,-2,5], 1) => -2
""",
        """
Return null for a negative index. Otherwise advance current exactly index times and return current.Value when a node exists.
""",
        "public static int? GetByIndex(ListNode? head, int index)",
        ["linked-list", "indexing", "pointers"],
        LinkedListGetStarter(),
        LinkedListGetReference());

    /// <summary>
    /// Gets the linked list cycle detection exercise.
    /// </summary>
    public static BasicExerciseResponse DetectLinkedListCycle { get; } = BasicExerciseFactory.Create(
        "fast-slow-detect-linked-list-cycle",
        "Fast And Slow Pointers: Detect Linked List Cycle",
        LearningDifficulty.Medium,
        "Determine whether a singly linked list contains a cycle using two pointers.",
        """
Given the head of a singly linked list, determine whether the list contains a cycle.

Use a slow pointer that advances one node at a time and a fast pointer that advances two nodes at a time. Return true when they meet and false when the fast pointer reaches the end of the list.
""",
        """
Example 1:
Input: head = 3 -> 2 -> 0 -> -4, with -4 pointing to 2
Output: true

Example 2:
Input: head = 1 -> 2 -> null
Output: false

Example 3:
Input: head = 1, with 1 pointing to itself
Output: true
""",
        """
- The list may be empty.
- Node values may be duplicated and may be negative.
- The cycle may start at the head, in the middle, or at the only node.
- Do not modify the list.
- Target time complexity: O(n).
- Target space complexity: O(1).
""",
        """
HasCycle(null) => false
HasCycle([1]) => false
HasCycle([1], cycle starts at 0) => true
HasCycle([1,2]) => false
HasCycle([1,2], cycle starts at 0) => true
HasCycle([1,2,3,4], cycle starts at 2) => true
HasCycle([3,-2,-2,4], cycle starts at 1) => true
HasCycle([1,2,3,4], no cycle) => false
""",
        """
Initialize slow and fast at head. Move slow once and fast twice in a loop. If they meet, the list has a cycle; if fast or fast.Next becomes null, the list is acyclic.
""",
        "public static bool HasCycle(ListNode? head)",
        ["linked-list", "fast-slow-pointers", "cycle-detection", "floyd"],
        """
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
    /// Determines whether a linked list contains a cycle.
    /// </summary>
    /// <param name="head">The linked list head.</param>
    /// <returns><see langword="true"/> when the list contains a cycle.</returns>
    public static bool HasCycle(ListNode? head)
    {
        return false;
    }
}
""",
        """
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
    /// Determines whether a linked list contains a cycle.
    /// </summary>
    /// <param name="head">The linked list head.</param>
    /// <returns><see langword="true"/> when the list contains a cycle.</returns>
    public static bool HasCycle(ListNode? head)
    {
        var slow = head;
        var fast = head;

        while (fast is not null && fast.Next is not null)
        {
            slow = slow!.Next;
            fast = fast.Next.Next;

            if (slow == fast)
            {
                return true;
            }
        }

        return false;
    }
}
""");

    /// <summary>
    /// Creates the linked list insertion starter code.
    /// </summary>
    /// <returns>The insertion starter code.</returns>
    private static string LinkedListInsertStarter()
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
        return new ListNode { Value = value };
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
}
""";
    }

    /// <summary>
    /// Creates the linked list insertion reference solution.
    /// </summary>
    /// <returns>The insertion reference solution.</returns>
    private static string LinkedListInsertReference()
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
}
""";
    }

    /// <summary>
    /// Creates the linked list indexed lookup starter code.
    /// </summary>
    /// <returns>The lookup starter code.</returns>
    private static string LinkedListGetStarter()
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
    /// Creates the linked list indexed lookup reference solution.
    /// </summary>
    /// <returns>The lookup reference solution.</returns>
    private static string LinkedListGetReference()
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
