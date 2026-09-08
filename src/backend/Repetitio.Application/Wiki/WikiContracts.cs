namespace Repetitio.Application.Wiki;

/// <summary>
/// Represents the request payload for creating a wiki page.
/// </summary>
public sealed record CreateWikiPageRequest
{
    /// <summary>
    /// Gets the optional parent page identifier.
    /// </summary>
    public Guid? ParentId { get; init; }

    /// <summary>
    /// Gets the wiki page title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the optional URL-friendly slug.
    /// </summary>
    public string? Slug { get; init; }

    /// <summary>
    /// Gets a short page summary.
    /// </summary>
    public string? Summary { get; init; }

    /// <summary>
    /// Gets the editable markdown content.
    /// </summary>
    public string? ContentMarkdown { get; init; }
}

/// <summary>
/// Represents the request payload for updating a wiki page.
/// </summary>
public sealed record UpdateWikiPageRequest
{
    /// <summary>
    /// Gets the optional parent page identifier.
    /// </summary>
    public Guid? ParentId { get; init; }

    /// <summary>
    /// Gets the wiki page title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the optional URL-friendly slug.
    /// </summary>
    public string? Slug { get; init; }

    /// <summary>
    /// Gets a short page summary.
    /// </summary>
    public string? Summary { get; init; }

    /// <summary>
    /// Gets the editable markdown content.
    /// </summary>
    public string? ContentMarkdown { get; init; }

    /// <summary>
    /// Gets the manual display order inside the parent page.
    /// </summary>
    public int SortOrder { get; init; }

    /// <summary>
    /// Gets whether the page is archived.
    /// </summary>
    public bool IsArchived { get; init; }
}

/// <summary>
/// Represents one wiki page node in a batch import payload.
/// </summary>
public sealed record ImportWikiPageNodeRequest
{
    /// <summary>
    /// Gets the wiki page title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the optional URL-friendly slug.
    /// </summary>
    public string? Slug { get; init; }

    /// <summary>
    /// Gets a short page summary.
    /// </summary>
    public string? Summary { get; init; }

    /// <summary>
    /// Gets the editable markdown content.
    /// </summary>
    public string? ContentMarkdown { get; init; }

    /// <summary>
    /// Gets nested child pages to import under this page.
    /// </summary>
    public IReadOnlyCollection<ImportWikiPageNodeRequest>? Children { get; init; }
}

/// <summary>
/// Represents the request payload for importing multiple wiki pages as a tree.
/// </summary>
public sealed record ImportWikiPagesRequest
{
    /// <summary>
    /// Gets the optional parent page identifier for imported root nodes.
    /// </summary>
    public Guid? ParentId { get; init; }

    /// <summary>
    /// Gets imported root page nodes.
    /// </summary>
    public required IReadOnlyCollection<ImportWikiPageNodeRequest> Pages { get; init; }
}

/// <summary>
/// Represents the result of a wiki batch import.
/// </summary>
public sealed record ImportWikiPagesResponse
{
    /// <summary>
    /// Gets the number of imported wiki pages, including descendants.
    /// </summary>
    public required int ImportedCount { get; init; }

    /// <summary>
    /// Gets imported root page responses.
    /// </summary>
    public required IReadOnlyCollection<WikiPageResponse> RootPages { get; init; }
}

/// <summary>
/// Represents one wiki page returned by the API.
/// </summary>
public sealed record WikiPageResponse
{
    /// <summary>
    /// Gets the wiki page identifier.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the optional parent page identifier.
    /// </summary>
    public Guid? ParentId { get; init; }

    /// <summary>
    /// Gets the wiki page title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the URL-friendly slug.
    /// </summary>
    public required string Slug { get; init; }

    /// <summary>
    /// Gets the slash-separated materialized path.
    /// </summary>
    public required string Path { get; init; }

    /// <summary>
    /// Gets the zero-based tree depth.
    /// </summary>
    public required int Depth { get; init; }

    /// <summary>
    /// Gets the manual display order inside the parent page.
    /// </summary>
    public required int SortOrder { get; init; }

    /// <summary>
    /// Gets a short page summary.
    /// </summary>
    public string? Summary { get; init; }

    /// <summary>
    /// Gets the editable markdown content.
    /// </summary>
    public required string ContentMarkdown { get; init; }

    /// <summary>
    /// Gets whether the page is archived.
    /// </summary>
    public required bool IsArchived { get; init; }

    /// <summary>
    /// Gets the number of direct child pages.
    /// </summary>
    public required int ChildCount { get; init; }

    /// <summary>
    /// Gets the date and time when the page was created.
    /// </summary>
    public required DateTime CreatedAt { get; init; }

    /// <summary>
    /// Gets the date and time when the page was last updated.
    /// </summary>
    public required DateTime UpdatedAt { get; init; }
}

/// <summary>
/// Represents one wiki page in the navigation tree.
/// </summary>
public sealed record WikiTreeNodeResponse
{
    /// <summary>
    /// Gets the wiki page identifier.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the optional parent page identifier.
    /// </summary>
    public Guid? ParentId { get; init; }

    /// <summary>
    /// Gets the wiki page title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the slash-separated materialized path.
    /// </summary>
    public required string Path { get; init; }

    /// <summary>
    /// Gets the zero-based tree depth.
    /// </summary>
    public required int Depth { get; init; }

    /// <summary>
    /// Gets the manual display order inside the parent page.
    /// </summary>
    public required int SortOrder { get; init; }

    /// <summary>
    /// Gets the date and time when the page was last updated.
    /// </summary>
    public required DateTime UpdatedAt { get; init; }
}

/// <summary>
/// Represents a paged wiki page search result.
/// </summary>
public sealed record PagedWikiPageResponse
{
    /// <summary>
    /// Gets the pages on the current page.
    /// </summary>
    public required IReadOnlyCollection<WikiPageResponse> Items { get; init; }

    /// <summary>
    /// Gets the total number of matching pages.
    /// </summary>
    public required int TotalCount { get; init; }

    /// <summary>
    /// Gets the current one-based page number.
    /// </summary>
    public required int Page { get; init; }

    /// <summary>
    /// Gets the number of requested wiki pages per page.
    /// </summary>
    public required int PageSize { get; init; }
}
