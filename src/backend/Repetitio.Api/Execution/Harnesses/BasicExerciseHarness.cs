namespace Repetitio.Api.Execution.Harnesses;

/// <summary>
/// Creates a C# test harness from reusable test source snippets.
/// </summary>
public sealed class BasicExerciseHarness : IBasicExerciseHarness
{
    private readonly string testSource;
    private readonly string supportSource;
    private readonly bool includeLinkedListHelpers;

    /// <summary>
    /// Initializes a new instance of the <see cref="BasicExerciseHarness"/> class.
    /// </summary>
    /// <param name="slug">The exercise slug.</param>
    /// <param name="testSource">The C# statements that append test results.</param>
    /// <param name="supportSource">Optional C# support source appended after the submission.</param>
    /// <param name="includeLinkedListHelpers">Whether the harness should include ListNode helpers.</param>
    public BasicExerciseHarness(
        string slug,
        string testSource,
        string supportSource = "",
        bool includeLinkedListHelpers = false)
    {
        Slug = slug;
        this.testSource = testSource;
        this.supportSource = supportSource;
        this.includeLinkedListHelpers = includeLinkedListHelpers;
    }

    /// <inheritdoc />
    public string Slug { get; }

    /// <inheritdoc />
    public string CreateProgram(string sourceCode)
    {
        return $$"""
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

{{sourceCode}}

{{supportSource}}

public static class RepetitioTestHarness
{
    public static int Main()
    {
        var results = new List<RepetitioTestResult>();

{{testSource}}

        Console.WriteLine("{{BasicExerciseExecutionMarkers.ResultsMarker}}" + JsonSerializer.Serialize(results));
        return results.All(result => result.Passed) ? 0 : 1;
    }

    private static RepetitioTestResult RunInt(string name, int expected, Func<int> action)
    {
        try
        {
            var actual = action();
            return new RepetitioTestResult(name, actual == expected, expected.ToString(), actual.ToString(), null);
        }
        catch (Exception exception)
        {
            return CreateExceptionResult(name, expected.ToString(), exception);
        }
    }

    private static RepetitioTestResult RunNullableInt(string name, int? expected, Func<int?> action)
    {
        try
        {
            var actual = action();
            return new RepetitioTestResult(name, actual == expected, FormatNullable(expected), FormatNullable(actual), null);
        }
        catch (Exception exception)
        {
            return CreateExceptionResult(name, FormatNullable(expected), exception);
        }
    }

    private static RepetitioTestResult RunDouble(string name, double expected, Func<double> action)
    {
        try
        {
            var actual = action();
            var passed = Math.Abs(actual - expected) <= 0.00001;
            return new RepetitioTestResult(name, passed, expected.ToString("0.#####"), actual.ToString("0.#####"), null);
        }
        catch (Exception exception)
        {
            return CreateExceptionResult(name, expected.ToString("0.#####"), exception);
        }
    }

    private static RepetitioTestResult RunBool(string name, bool expected, Func<bool> action)
    {
        try
        {
            var actual = action();
            return new RepetitioTestResult(name, actual == expected, expected.ToString(), actual.ToString(), null);
        }
        catch (Exception exception)
        {
            return CreateExceptionResult(name, expected.ToString(), exception);
        }
    }

    private static RepetitioTestResult RunArray(string name, int[] expected, Func<int[]> action)
    {
        try
        {
            var actual = action();
            return new RepetitioTestResult(name, actual.SequenceEqual(expected), FormatArray(expected), FormatArray(actual), null);
        }
        catch (Exception exception)
        {
            return CreateExceptionResult(name, FormatArray(expected), exception);
        }
    }

    private static RepetitioTestResult RunException<TException>(string name, Action action)
        where TException : Exception
    {
        try
        {
            action();
            return new RepetitioTestResult(name, false, typeof(TException).Name, "no exception", null);
        }
        catch (TException)
        {
            return new RepetitioTestResult(name, true, typeof(TException).Name, typeof(TException).Name, null);
        }
        catch (Exception exception)
        {
            return CreateExceptionResult(name, typeof(TException).Name, exception);
        }
    }

    private static string FormatArray(int[] values)
    {
        return "[" + string.Join(",", values) + "]";
    }

    private static string FormatNullable(int? value)
    {
        return value?.ToString() ?? "null";
    }

    private static RepetitioTestResult CreateExceptionResult(string name, string expected, Exception exception)
    {
        return new RepetitioTestResult(
            name,
            false,
            expected,
            "exception",
            exception.GetType().Name + ": " + exception.Message);
    }

{{CreateLinkedListHelpers()}}
}

public sealed record RepetitioTestResult(string Name, bool Passed, string Expected, string Actual, string? Error);
""";
    }

    /// <summary>
    /// Creates optional linked list helper methods.
    /// </summary>
    /// <returns>The linked list helper source when requested; otherwise, an empty string.</returns>
    private string CreateLinkedListHelpers()
    {
        if (!includeLinkedListHelpers)
        {
            return string.Empty;
        }

        return """
    private static RepetitioTestResult RunList(string name, int[] expected, Func<ListNode?> action)
    {
        try
        {
            var actual = ToArray(action());
            return new RepetitioTestResult(name, actual.SequenceEqual(expected), FormatList(expected), FormatList(actual), null);
        }
        catch (Exception exception)
        {
            return CreateExceptionResult(name, FormatList(expected), exception);
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

    private static ListNode? BuildCyclicList(int[] values, int cycleStartIndex)
    {
        var head = BuildList(values);

        if (head is null || cycleStartIndex < 0)
        {
            return head;
        }

        var cycleStart = head;

        for (var index = 0; index < cycleStartIndex && cycleStart is not null; index++)
        {
            cycleStart = cycleStart.Next;
        }

        if (cycleStart is null)
        {
            return head;
        }

        var tail = head;

        while (tail.Next is not null)
        {
            tail = tail.Next;
        }

        tail.Next = cycleStart;
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
                throw new InvalidOperationException("The returned list is longer than expected.");
            }

            values.Add(current.Value);
            current = current.Next;
        }

        return values.ToArray();
    }

    private static string FormatList(int[] values)
    {
        return values.Length == 0 ? "empty" : string.Join(" -> ", values);
    }
""";
    }
}
