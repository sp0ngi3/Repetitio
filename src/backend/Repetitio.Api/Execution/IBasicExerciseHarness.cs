namespace Repetitio.Api.Execution;

/// <summary>
/// Creates executable C# harness source for one Basics exercise.
/// </summary>
public interface IBasicExerciseHarness
{
    /// <summary>
    /// Gets the exercise slug supported by the harness.
    /// </summary>
    string Slug { get; }

    /// <summary>
    /// Creates a complete C# program that tests a submitted solution.
    /// </summary>
    /// <param name="sourceCode">The user-submitted source code.</param>
    /// <returns>A complete C# program containing the submission and tests.</returns>
    string CreateProgram(string sourceCode);
}
