namespace Repetitio.Application.Dsa;

/// <summary>
/// Represents the request payload for creating a DSA solution.
/// </summary>
public sealed record CreateDsaSolutionRequest
{
    /// <summary>
    /// Gets the programming language used by the solution.
    /// </summary>
    public required string Language { get; init; }

    /// <summary>
    /// Gets the source code.
    /// </summary>
    public required string SourceCode { get; init; }

    /// <summary>
    /// Gets the explanation for the solution.
    /// </summary>
    public string? Explanation { get; init; }

    /// <summary>
    /// Gets the time complexity.
    /// </summary>
    public string? TimeComplexity { get; init; }

    /// <summary>
    /// Gets the space complexity.
    /// </summary>
    public string? SpaceComplexity { get; init; }
}

/// <summary>
/// Represents a DSA solution returned by the API.
/// </summary>
public sealed record DsaSolutionResponse
{
    /// <summary>
    /// Gets the unique solution identifier.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the programming language used by the solution.
    /// </summary>
    public required string Language { get; init; }

    /// <summary>
    /// Gets the source code.
    /// </summary>
    public required string SourceCode { get; init; }

    /// <summary>
    /// Gets the explanation for the solution.
    /// </summary>
    public string? Explanation { get; init; }

    /// <summary>
    /// Gets the time complexity.
    /// </summary>
    public string? TimeComplexity { get; init; }

    /// <summary>
    /// Gets the space complexity.
    /// </summary>
    public string? SpaceComplexity { get; init; }

    /// <summary>
    /// Gets the date and time when the solution was created.
    /// </summary>
    public required DateTime CreatedAt { get; init; }
}
