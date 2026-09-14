namespace Repetitio.Domain.Wiki;

/// <summary>
/// Represents one markdown page in the personal knowledge repository.
/// </summary>
public sealed class WikiPage
{
    /// <summary>
    /// Gets or sets the wiki page identifier.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the optional parent page identifier.
    /// </summary>
    public Guid? ParentId { get; set; }

    /// <summary>
    /// Gets or sets the parent wiki page.
    /// </summary>
    public WikiPage? Parent { get; set; }

    /// <summary>
    /// Gets the child wiki pages.
    /// </summary>
    public ICollection<WikiPage> Children { get; } = [];

    /// <summary>
    /// Gets the loose sources attached to the page.
    /// </summary>
    public ICollection<WikiSource> Sources { get; } = [];

    /// <summary>
    /// Gets the lightweight quiz questions attached to the page.
    /// </summary>
    public ICollection<WikiQuizQuestion> QuizQuestions { get; } = [];

    /// <summary>
    /// Gets the lightweight flashcards attached to the page.
    /// </summary>
    public ICollection<WikiFlashcard> Flashcards { get; } = [];

    /// <summary>
    /// Gets or sets the page title.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a URL-friendly slug unique under the same parent.
    /// </summary>
    public string Slug { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the slash-separated materialized path used for tree navigation.
    /// </summary>
    public string Path { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the zero-based tree depth.
    /// </summary>
    public int Depth { get; set; }

    /// <summary>
    /// Gets or sets the manual display order inside the parent page.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Gets or sets a short page summary.
    /// </summary>
    public string? Summary { get; set; }

    /// <summary>
    /// Gets or sets the editable markdown body.
    /// </summary>
    public string ContentMarkdown { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets whether the page is archived.
    /// </summary>
    public bool IsArchived { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the page was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the page was last updated.
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}
