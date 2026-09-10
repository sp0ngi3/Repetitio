namespace Repetitio.Domain.Wiki;

/// <summary>
/// Represents a lightweight flashcard attached to a wiki page.
/// </summary>
public sealed class WikiFlashcard
{
    /// <summary>
    /// Gets or sets the flashcard identifier.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the parent wiki page identifier.
    /// </summary>
    public Guid WikiPageId { get; set; }

    /// <summary>
    /// Gets or sets the parent wiki page.
    /// </summary>
    public WikiPage? WikiPage { get; set; }

    /// <summary>
    /// Gets or sets the front side.
    /// </summary>
    public string Front { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the back side.
    /// </summary>
    public string Back { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the manual display order inside the page.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the flashcard was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the flashcard was last updated.
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}
