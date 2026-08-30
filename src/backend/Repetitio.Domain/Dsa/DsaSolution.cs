namespace Repetitio.Domain.Dsa;

/// <summary>
/// Represents a saved solution for a DSA problem.
/// </summary>
public sealed class DsaSolution
{
    /// <summary>
    /// Gets or sets the unique solution identifier.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the related DSA learning item identifier.
    /// </summary>
    public Guid LearningItemId { get; set; }

    /// <summary>
    /// Gets or sets the related DSA problem.
    /// </summary>
    public DsaProblem Problem { get; set; } = null!;

    /// <summary>
    /// Gets or sets the programming language used by the solution.
    /// </summary>
    public string Language { get; set; } = "C#";

    /// <summary>
    /// Gets or sets the source code.
    /// </summary>
    public string SourceCode { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the explanation for the solution.
    /// </summary>
    public string? Explanation { get; set; }

    /// <summary>
    /// Gets or sets the time complexity.
    /// </summary>
    public string? TimeComplexity { get; set; }

    /// <summary>
    /// Gets or sets the space complexity.
    /// </summary>
    public string? SpaceComplexity { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the solution was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }
}
