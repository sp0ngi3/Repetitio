namespace Repetitio.Application.Basics;

/// <summary>
/// Represents a request to compile and execute a Basics exercise solution.
/// </summary>
public sealed record ExecuteBasicExerciseRequest
{
    /// <summary>
    /// Gets the C# source code submitted by the user.
    /// </summary>
    public required string SourceCode { get; init; }

    /// <summary>
    /// Gets the optional execution timeout in milliseconds.
    /// </summary>
    public int? TimeoutMs { get; init; }
}

/// <summary>
/// Represents the result of compiling and executing a Basics exercise solution.
/// </summary>
public sealed record ExecuteBasicExerciseResponse
{
    /// <summary>
    /// Gets a value indicating whether the submitted source code compiled successfully.
    /// </summary>
    public required bool Compiled { get; init; }

    /// <summary>
    /// Gets a value indicating whether execution exceeded the configured timeout.
    /// </summary>
    public required bool TimedOut { get; init; }

    /// <summary>
    /// Gets a value indicating whether every automated test passed.
    /// </summary>
    public required bool Passed { get; init; }

    /// <summary>
    /// Gets compiler output when compilation fails or emits warnings.
    /// </summary>
    public string? CompilerOutput { get; init; }

    /// <summary>
    /// Gets runtime output captured from the submitted program and test harness.
    /// </summary>
    public string? RuntimeOutput { get; init; }

    /// <summary>
    /// Gets the test results produced by the exercise test harness.
    /// </summary>
    public required IReadOnlyCollection<BasicExerciseTestResultResponse> TestResults { get; init; }
}

/// <summary>
/// Represents one automated Basics exercise test result.
/// </summary>
public sealed record BasicExerciseTestResultResponse
{
    /// <summary>
    /// Gets the test case name.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Gets a value indicating whether the test passed.
    /// </summary>
    public required bool Passed { get; init; }

    /// <summary>
    /// Gets the expected output.
    /// </summary>
    public required string Expected { get; init; }

    /// <summary>
    /// Gets the actual output.
    /// </summary>
    public required string Actual { get; init; }

    /// <summary>
    /// Gets an optional runtime error for the test case.
    /// </summary>
    public string? Error { get; init; }
}
