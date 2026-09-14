namespace Repetitio.Domain.Wiki;

/// <summary>
/// Represents one loose source attached to a wiki page.
/// </summary>
public sealed class WikiSource
{
    /// <summary>
    /// Gets or sets the source identifier.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the wiki page identifier.
    /// </summary>
    public Guid WikiPageId { get; set; }

    /// <summary>
    /// Gets or sets the wiki page.
    /// </summary>
    public WikiPage? WikiPage { get; set; }

    /// <summary>
    /// Gets or sets the source title.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the source type, such as book, article, course, paper, video, or notes.
    /// </summary>
    public string? Type { get; set; }

    /// <summary>
    /// Gets or sets the optional author or publisher.
    /// </summary>
    public string? Author { get; set; }

    /// <summary>
    /// Gets or sets the optional URL.
    /// </summary>
    public string? Url { get; set; }

    /// <summary>
    /// Gets or sets the optional source locator, such as chapter, page, section, or timestamp.
    /// </summary>
    public string? Locator { get; set; }

    /// <summary>
    /// Gets or sets optional notes about the source.
    /// </summary>
    public string? Notes { get; set; }

    /// <summary>
    /// Gets or sets the manual display order inside the page.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the source was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the source was last updated.
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}
