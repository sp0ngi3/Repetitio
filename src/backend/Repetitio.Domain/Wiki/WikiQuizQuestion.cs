namespace Repetitio.Domain.Wiki;

/// <summary>
/// Represents a lightweight quiz question attached to a wiki page.
/// </summary>
public sealed class WikiQuizQuestion
{
    /// <summary>
    /// Gets or sets the quiz question identifier.
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
    /// Gets or sets the quiz prompt.
    /// </summary>
    public string Prompt { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the optional explanation shown after answering.
    /// </summary>
    public string? Explanation { get; set; }

    /// <summary>
    /// Gets or sets the manual display order inside the page.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the quiz question was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the quiz question was last updated.
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Gets the answer options.
    /// </summary>
    public ICollection<WikiQuizOption> Options { get; } = [];
}
