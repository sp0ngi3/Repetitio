namespace Repetitio.Api.Execution.Harnesses;

/// <summary>
/// Creates the test harness for the Reverse Linked List Basics exercise.
/// </summary>
public sealed class ReverseLinkedListHarness : IBasicExerciseHarness
{
    /// <summary>
    /// Gets the exercise slug supported by this harness.
    /// </summary>
    public string Slug => "reverse-linked-list";

    /// <summary>
    /// Creates a complete C# program that validates a Reverse Linked List submission.
    /// </summary>
    /// <param name="sourceCode">The user-submitted C# source code.</param>
    /// <returns>A complete C# test harness program.</returns>
    public string CreateProgram(string sourceCode)
    {
        return $$"""
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

{{sourceCode}}

public static class RepetitioTestHarness
{
    public static int Main()
    {
        var results = new List<RepetitioTestResult>
        {
            RunReverseTest("empty list", [], []),
            RunReverseTest("single node", [42], [42]),
            RunReverseTest("two nodes", [1, 2], [2, 1]),
            RunReverseTest("five nodes", [1, 2, 3, 4, 5], [5, 4, 3, 2, 1]),
            RunReverseTest("duplicates and negatives", [1, -2, -2, 4], [4, -2, -2, 1])
        };

        Console.WriteLine("{{BasicExerciseExecutionMarkers.ResultsMarker}}" + JsonSerializer.Serialize(results));
        return results.All(result => result.Passed) ? 0 : 1;
    }

    private static RepetitioTestResult RunReverseTest(string name, int[] input, int[] expected)
    {
        try
        {
            var actualValues = ToArray(Solution.Reverse(BuildList(input)));
            var expectedText = Format(expected);
            var actualText = Format(actualValues);

            return new RepetitioTestResult(
                name,
                actualValues.SequenceEqual(expected),
                expectedText,
                actualText,
                null);
        }
        catch (Exception exception)
        {
            return new RepetitioTestResult(name, false, Format(expected), "exception", exception.GetType().Name + ": " + exception.Message);
        }
    }

    private static ListNode? BuildList(int[] values)
    {
        ListNode? head = null;

        for (var index = values.Length - 1; index >= 0; index--)
        {
            head = new ListNode
            {
                Value = values[index],
                Next = head
            };
        }

        return head;
    }

    private static int[] ToArray(ListNode? head)
    {
        var values = new List<int>();
        var visited = new HashSet<ListNode>();
        var current = head;

        while (current is not null)
        {
            if (!visited.Add(current))
            {
                throw new InvalidOperationException("The returned list contains a cycle.");
            }

            if (values.Count > 100)
            {
                throw new InvalidOperationException("The returned list is longer than the test input.");
            }

            values.Add(current.Value);
            current = current.Next;
        }

        return values.ToArray();
    }

    private static string Format(int[] values)
    {
        return values.Length == 0 ? "empty" : string.Join(" -> ", values);
    }
}

public sealed record RepetitioTestResult(string Name, bool Passed, string Expected, string Actual, string? Error);
""";
    }
}
