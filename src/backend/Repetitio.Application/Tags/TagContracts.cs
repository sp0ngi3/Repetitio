namespace Repetitio.Application.Tags;

/// <summary>
/// Represents the request payload for creating a tag.
/// </summary>
public sealed record CreateTagRequest
{
    /// <summary>
    /// Gets the tag name.
    /// </summary>
    public required string Name { get; init; }
}

/// <summary>
/// Represents a tag returned by the API.
/// </summary>
public sealed record TagResponse
{
    /// <summary>
    /// Gets the unique tag identifier.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the tag name.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Gets the date and time when the tag was created.
    /// </summary>
    public required DateTime CreatedAt { get; init; }
}
