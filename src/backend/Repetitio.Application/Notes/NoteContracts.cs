using Repetitio.Domain.Notes;

namespace Repetitio.Application.Notes;

/// <summary>
/// Represents the request payload for creating a note page.
/// </summary>
public sealed record CreateNotePageRequest
{
    /// <summary>
    /// Gets the notebook area for the note page.
    /// </summary>
    public required NoteArea Area { get; init; }

    /// <summary>
    /// Gets the note page title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the markdown content for the page.
    /// </summary>
    public string? ContentMarkdown { get; init; }
}

/// <summary>
/// Represents the request payload for updating a note page.
/// </summary>
public sealed record UpdateNotePageRequest
{
    /// <summary>
    /// Gets the notebook area for the note page.
    /// </summary>
    public required NoteArea Area { get; init; }

    /// <summary>
    /// Gets the note page title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the markdown content for the page.
    /// </summary>
    public string? ContentMarkdown { get; init; }

    /// <summary>
    /// Gets the manual display order inside the notebook area.
    /// </summary>
    public int SortOrder { get; init; }
}

/// <summary>
/// Represents a note page returned by the API.
/// </summary>
public sealed record NotePageResponse
{
    /// <summary>
    /// Gets the note page identifier.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the notebook area for the note page.
    /// </summary>
    public required NoteArea Area { get; init; }

    /// <summary>
    /// Gets the note page title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the markdown content for the page.
    /// </summary>
    public required string ContentMarkdown { get; init; }

    /// <summary>
    /// Gets the manual display order inside the notebook area.
    /// </summary>
    public required int SortOrder { get; init; }

    /// <summary>
    /// Gets the date and time when the note page was created.
    /// </summary>
    public required DateTime CreatedAt { get; init; }

    /// <summary>
    /// Gets the date and time when the note page was last updated.
    /// </summary>
    public required DateTime UpdatedAt { get; init; }
}
