namespace Repetitio.Application.Basics;

/// <summary>
/// Represents a built-in Basics exercise returned by the API.
/// </summary>
public sealed record BasicExerciseResponse
{
    /// <summary>
    /// Gets the stable exercise slug.
    /// </summary>
    public required string Slug { get; init; }

    /// <summary>
    /// Gets the exercise title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the programming language used by the exercise.
    /// </summary>
    public required string Language { get; init; }

    /// <summary>
    /// Gets the exercise instructions.
    /// </summary>
    public required string Instructions { get; init; }

    /// <summary>
    /// Gets the starter code shown to the user.
    /// </summary>
    public required string StarterCode { get; init; }

    /// <summary>
    /// Gets the function signature expected by the exercise.
    /// </summary>
    public required string FunctionSignature { get; init; }

    /// <summary>
    /// Gets the reference solution that can be peeked by the user.
    /// </summary>
    public required string ReferenceSolution { get; init; }

    /// <summary>
    /// Gets the tag names associated with the exercise.
    /// </summary>
    public required IReadOnlyCollection<string> Tags { get; init; }
}
