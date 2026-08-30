using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.Basics.Exercises;

/// <summary>
/// Provides built-in Basics exercises for recursion.
/// </summary>
public static class RecursionExercises
{
    /// <summary>
    /// Gets the recursive factorial exercise.
    /// </summary>
    public static BasicExerciseResponse Factorial { get; } = BasicExerciseFactory.Create(
        "recursion-factorial",
        "Recursion: Factorial",
        LearningDifficulty.Easy,
        "Return n factorial using recursion.",
        """
Given a non-negative integer n, return n factorial.

The factorial of 0 and 1 is 1. For every larger n, n! equals n multiplied by (n - 1)!.
""",
        """
Example 1:
Input: n = 5
Output: 120

Example 2:
Input: n = 0
Output: 1
""",
        """
- 0 <= n <= 12.
- Use recursion.
- The result fits in a 32-bit signed integer.
""",
        """
FactorialOfNumber(0) => 1
FactorialOfNumber(1) => 1
FactorialOfNumber(2) => 2
FactorialOfNumber(3) => 6
FactorialOfNumber(4) => 24
FactorialOfNumber(5) => 120
FactorialOfNumber(6) => 720
FactorialOfNumber(7) => 5040
FactorialOfNumber(10) => 3628800
FactorialOfNumber(12) => 479001600
""",
        "Define the base case first, then return n multiplied by the recursive result for n - 1.",
        "public static int FactorialOfNumber(int n)",
        ["recursion", "math", "base-case"],
        IntStarter("FactorialOfNumber", "int n"),
        """
public static class Solution
{
    /// <summary>
    /// Calculates n factorial recursively.
    /// </summary>
    /// <param name="n">The non-negative input number.</param>
    /// <returns>The factorial value.</returns>
    public static int FactorialOfNumber(int n)
    {
        if (n <= 1)
        {
            return 1;
        }

        return n * FactorialOfNumber(n - 1);
    }
}
""");

    /// <summary>
    /// Gets the recursive Fibonacci exercise.
    /// </summary>
    public static BasicExerciseResponse Fibonacci { get; } = BasicExerciseFactory.Create(
        "recursion-fibonacci",
        "Recursion: Fibonacci",
        LearningDifficulty.Easy,
        "Return the nth Fibonacci number using recursion.",
        """
Given a non-negative integer n, return the nth Fibonacci number.

Fibonacci(0) is 0 and Fibonacci(1) is 1. Every later value is the sum of the previous two values.
""",
        """
Example 1:
Input: n = 4
Output: 3

Example 2:
Input: n = 7
Output: 13
""",
        """
- 0 <= n <= 20.
- Use recursion.
- This exercise intentionally practices the simple recursive shape.
""",
        """
FibonacciSeries(0) => 0
FibonacciSeries(1) => 1
FibonacciSeries(2) => 1
FibonacciSeries(3) => 2
FibonacciSeries(4) => 3
FibonacciSeries(5) => 5
FibonacciSeries(6) => 8
FibonacciSeries(7) => 13
FibonacciSeries(10) => 55
FibonacciSeries(20) => 6765
""",
        "Handle n <= 1 as the base case, then recursively combine n - 1 and n - 2.",
        "public static int FibonacciSeries(int n)",
        ["recursion", "math", "fibonacci", "base-case"],
        IntStarter("FibonacciSeries", "int n"),
        """
public static class Solution
{
    /// <summary>
    /// Calculates the nth Fibonacci number recursively.
    /// </summary>
    /// <param name="n">The zero-based Fibonacci index.</param>
    /// <returns>The nth Fibonacci number.</returns>
    public static int FibonacciSeries(int n)
    {
        if (n <= 1)
        {
            return n;
        }

        return FibonacciSeries(n - 1) + FibonacciSeries(n - 2);
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
        return 0;
    }
}
""";
    }
}
