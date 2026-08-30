using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.Basics.Exercises;

/// <summary>
/// Provides the built-in Reverse Linked List Basics exercise.
/// </summary>
public static class ReverseLinkedListExercise
{
    /// <summary>
    /// Gets the exercise definition.
    /// </summary>
    public static BasicExerciseResponse Definition { get; } = new()
    {
        Slug = "reverse-linked-list",
        Title = "Reverse Linked List",
        Language = "C#",
        Difficulty = LearningDifficulty.Easy,
        Instructions = "Reverse a singly linked list in place and return the new head node.",
        ProblemStatement = """
Given the head of a singly linked list, reverse the list so that every node points to the previous node instead of the next node.

Return the new head of the reversed list. The implementation should mutate the existing nodes and should not allocate another list.
""",
        Examples = """
Example 1:
Input: 1 -> 2 -> 3 -> 4 -> 5
Output: 5 -> 4 -> 3 -> 2 -> 1

Example 2:
Input: 1 -> 2
Output: 2 -> 1

Example 3:
Input: empty list
Output: empty list
""",
        Constraints = """
- The list may be empty.
- The list may contain a single node.
- Node values can be any integer.
- Target time complexity: O(n).
- Target space complexity: O(1).
""",
        TestCases = """
Reverse(null) => null
Reverse(1) => 1
Reverse(1 -> 2) => 2 -> 1
Reverse(1 -> 2 -> 3 -> 4 -> 5) => 5 -> 4 -> 3 -> 2 -> 1
Reverse(1 -> -2 -> -2 -> 4) => 4 -> -2 -> -2 -> 1
""",
        ApproachGuide = """
Keep three pointers: previous, current, and next. Walk through the list once. For each node, remember current.Next, point current.Next back to previous, then move previous and current one step forward. When current becomes null, previous is the new head.
""",
        FunctionSignature = "public static ListNode? Reverse(ListNode? head)",
        Tags = ["linked-list", "pointers"],
        StarterCode = """
public sealed class ListNode
{
    public int Value { get; set; }
    public ListNode? Next { get; set; }
}

public static class Solution
{
    public static ListNode? Reverse(ListNode? head)
    {
        // Write your implementation here.
        return head;
    }
}
""",
        ReferenceSolution = """
public sealed class ListNode
{
    public int Value { get; set; }
    public ListNode? Next { get; set; }
}

public static class Solution
{
    public static ListNode? Reverse(ListNode? head)
    {
        ListNode? previous = null;
        var current = head;

        while (current is not null)
        {
            var next = current.Next;
            current.Next = previous;
            previous = current;
            current = next;
        }

        return previous;
    }
}
"""
    };
}
