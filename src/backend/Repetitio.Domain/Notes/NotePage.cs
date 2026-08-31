namespace Repetitio.Domain.Notes;

/// <summary>
/// Represents one editable note page inside a learning notebook.
/// </summary>
public sealed class NotePage
{
    /// <summary>
    /// Gets or sets the note page identifier.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the notebook area this page belongs to.
    /// </summary>
    public NoteArea Area { get; set; }

    /// <summary>
    /// Gets or sets the note page title.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the editable markdown content.
    /// </summary>
    public string ContentMarkdown { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the manual display order inside the notebook area.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the note page was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the note page was last updated.
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}
