namespace Repetitio.Application.Basics;

/// <summary>
/// Provides the hardcoded Basics exercise catalog for the MVP.
/// </summary>
public static class BasicExerciseCatalog
{
    /// <summary>
    /// Gets all built-in Basics exercises.
    /// </summary>
    /// <returns>The built-in exercise definitions.</returns>
    public static IReadOnlyCollection<BasicExerciseResponse> GetAll()
    {
        return Exercises;
    }

    /// <summary>
    /// Gets a built-in Basics exercise by slug.
    /// </summary>
    /// <param name="slug">The exercise slug.</param>
    /// <returns>The matching exercise when found; otherwise, <see langword="null"/>.</returns>
    public static BasicExerciseResponse? GetBySlug(string slug)
    {
        return Exercises.FirstOrDefault(exercise => exercise.Slug.Equals(slug, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Gets the hardcoded MVP exercise list.
    /// </summary>
    private static readonly BasicExerciseResponse[] Exercises =
    [
        new()
        {
            Slug = "kadane-algorithm",
            Title = "Kadane's Algorithm",
            Language = "C#",
            Instructions = "Return the maximum subarray sum for the provided integer array. The input contains at least one value.",
            FunctionSignature = "public static int MaxSubArray(int[] values)",
            Tags = ["arrays", "dynamic-programming"],
            StarterCode = """
public static int MaxSubArray(int[] values)
{
    // Write your implementation here.
}
""",
            ReferenceSolution = """
public static int MaxSubArray(int[] values)
{
    var best = values[0];
    var current = values[0];

    for (var index = 1; index < values.Length; index++)
    {
        current = Math.Max(values[index], current + values[index]);
        best = Math.Max(best, current);
    }

    return best;
}
"""
        },
        new()
        {
            Slug = "binary-search",
            Title = "Binary Search",
            Language = "C#",
            Instructions = "Return the index of the target in a sorted integer array, or -1 when the target is missing.",
            FunctionSignature = "public static int Search(int[] values, int target)",
            Tags = ["arrays", "search"],
            StarterCode = """
public static int Search(int[] values, int target)
{
    // Write your implementation here.
}
""",
            ReferenceSolution = """
public static int Search(int[] values, int target)
{
    var left = 0;
    var right = values.Length - 1;

    while (left <= right)
    {
        var middle = left + ((right - left) / 2);

        if (values[middle] == target)
        {
            return middle;
        }

        if (values[middle] < target)
        {
            left = middle + 1;
        }
        else
        {
            right = middle - 1;
        }
    }

    return -1;
}
"""
        },
        new()
        {
            Slug = "reverse-linked-list",
            Title = "Reverse Linked List",
            Language = "C#",
            Instructions = "Reverse a singly linked list and return the new head.",
            FunctionSignature = "public static ListNode? Reverse(ListNode? head)",
            Tags = ["linked-list", "pointers"],
            StarterCode = """
public static ListNode? Reverse(ListNode? head)
{
    // Write your implementation here.
}
""",
            ReferenceSolution = """
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
"""
        }
    ];
}
