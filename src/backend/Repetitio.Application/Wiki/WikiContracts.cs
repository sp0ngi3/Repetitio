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

    /// <summary>
    /// Gets loose sources attached to the page.
    /// </summary>
    public IReadOnlyCollection<WikiSourceRequest>? Sources { get; init; }

    /// <summary>
    /// Gets optional lightweight quiz questions attached to the page.
    /// </summary>
    public IReadOnlyCollection<WikiQuizQuestionRequest>? QuizQuestions { get; init; }

    /// <summary>
    /// Gets optional lightweight flashcards attached to the page.
    /// </summary>
    public IReadOnlyCollection<WikiFlashcardRequest>? Flashcards { get; init; }
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
    /// Gets loose sources attached to the page.
    /// </summary>
    public IReadOnlyCollection<WikiSourceRequest>? Sources { get; init; }

    /// <summary>
    /// Gets the manual display order inside the parent page.
    /// </summary>
    public int SortOrder { get; init; }

    /// <summary>
    /// Gets whether the page is archived.
    /// </summary>
    public bool IsArchived { get; init; }

    /// <summary>
    /// Gets optional lightweight quiz questions attached to the page.
    /// </summary>
    public IReadOnlyCollection<WikiQuizQuestionRequest>? QuizQuestions { get; init; }

    /// <summary>
    /// Gets optional lightweight flashcards attached to the page.
    /// </summary>
    public IReadOnlyCollection<WikiFlashcardRequest>? Flashcards { get; init; }
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
    /// Gets loose sources attached to the page.
    /// </summary>
    public IReadOnlyCollection<WikiSourceRequest>? Sources { get; init; }

    /// <summary>
    /// Gets optional lightweight quiz questions attached to the page.
    /// </summary>
    public IReadOnlyCollection<WikiQuizQuestionRequest>? QuizQuestions { get; init; }

    /// <summary>
    /// Gets optional lightweight flashcards attached to the page.
    /// </summary>
    public IReadOnlyCollection<WikiFlashcardRequest>? Flashcards { get; init; }

    /// <summary>
    /// Gets nested child pages to import under this page.
    /// </summary>
    public IReadOnlyCollection<ImportWikiPageNodeRequest>? Children { get; init; }
}

/// <summary>
/// Represents one loose wiki source request.
/// </summary>
public sealed record WikiSourceRequest
{
    /// <summary>
    /// Gets the source title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the source type, such as book, article, course, paper, video, or notes.
    /// </summary>
    public string? Type { get; init; }

    /// <summary>
    /// Gets the optional author or publisher.
    /// </summary>
    public string? Author { get; init; }

    /// <summary>
    /// Gets the optional URL.
    /// </summary>
    public string? Url { get; init; }

    /// <summary>
    /// Gets the optional source locator, such as chapter, page, section, or timestamp.
    /// </summary>
    public string? Locator { get; init; }

    /// <summary>
    /// Gets optional notes about the source.
    /// </summary>
    public string? Notes { get; init; }
}

/// <summary>
/// Represents one lightweight wiki quiz question request.
/// </summary>
public sealed record WikiQuizQuestionRequest
{
    /// <summary>
    /// Gets the quiz prompt.
    /// </summary>
    public required string Prompt { get; init; }

    /// <summary>
    /// Gets the answer options.
    /// </summary>
    public required IReadOnlyCollection<WikiQuizOptionRequest> Options { get; init; }

    /// <summary>
    /// Gets the optional explanation shown after answering.
    /// </summary>
    public string? Explanation { get; init; }
}

/// <summary>
/// Represents one lightweight wiki quiz answer option request.
/// </summary>
public sealed record WikiQuizOptionRequest
{
    /// <summary>
    /// Gets the answer option text.
    /// </summary>
    public required string Text { get; init; }

    /// <summary>
    /// Gets whether this option is correct.
    /// </summary>
    public bool IsCorrect { get; init; }
}

/// <summary>
/// Represents one lightweight wiki flashcard request.
/// </summary>
public sealed record WikiFlashcardRequest
{
    /// <summary>
    /// Gets the front side.
    /// </summary>
    public required string Front { get; init; }

    /// <summary>
    /// Gets the back side.
    /// </summary>
    public required string Back { get; init; }
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
/// Represents one locally stored wiki image returned by the API.
/// </summary>
public sealed record WikiImageResponse
{
    /// <summary>
    /// Gets the image identifier.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the sanitized original file name.
    /// </summary>
    public required string FileName { get; init; }

    /// <summary>
    /// Gets the image media type.
    /// </summary>
    public required string ContentType { get; init; }

    /// <summary>
    /// Gets the image size in bytes.
    /// </summary>
    public required long SizeBytes { get; init; }

    /// <summary>
    /// Gets the SHA-256 digest used for deduplication.
    /// </summary>
    public required string Sha256 { get; init; }

    /// <summary>
    /// Gets the API URL that returns the image bytes.
    /// </summary>
    public required string Url { get; init; }

    /// <summary>
    /// Gets a portable markdown snippet for embedding the image.
    /// </summary>
    public required string MarkdownSnippet { get; init; }

    /// <summary>
    /// Gets the date and time when the image was created.
    /// </summary>
    public required DateTime CreatedAt { get; init; }
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

    /// <summary>
    /// Gets loose sources attached to the page.
    /// </summary>
    public required IReadOnlyCollection<WikiSourceResponse> Sources { get; init; }

    /// <summary>
    /// Gets lightweight quiz questions attached to the page.
    /// </summary>
    public required IReadOnlyCollection<WikiQuizQuestionResponse> QuizQuestions { get; init; }

    /// <summary>
    /// Gets lightweight flashcards attached to the page.
    /// </summary>
    public required IReadOnlyCollection<WikiFlashcardResponse> Flashcards { get; init; }
}

/// <summary>
/// Represents one loose source attached to a wiki page.
/// </summary>
public sealed record WikiSourceResponse
{
    /// <summary>
    /// Gets the source identifier.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the source title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the source type.
    /// </summary>
    public string? Type { get; init; }

    /// <summary>
    /// Gets the optional author or publisher.
    /// </summary>
    public string? Author { get; init; }

    /// <summary>
    /// Gets the optional URL.
    /// </summary>
    public string? Url { get; init; }

    /// <summary>
    /// Gets the optional source locator.
    /// </summary>
    public string? Locator { get; init; }

    /// <summary>
    /// Gets optional notes about the source.
    /// </summary>
    public string? Notes { get; init; }

    /// <summary>
    /// Gets the manual display order inside the page.
    /// </summary>
    public required int SortOrder { get; init; }
}

/// <summary>
/// Represents one lightweight quiz question attached to a wiki page.
/// </summary>
public sealed record WikiQuizQuestionResponse
{
    /// <summary>
    /// Gets the quiz question identifier.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the quiz prompt.
    /// </summary>
    public required string Prompt { get; init; }

    /// <summary>
    /// Gets the optional explanation shown after answering.
    /// </summary>
    public string? Explanation { get; init; }

    /// <summary>
    /// Gets the manual display order inside the page.
    /// </summary>
    public required int SortOrder { get; init; }

    /// <summary>
    /// Gets answer options.
    /// </summary>
    public required IReadOnlyCollection<WikiQuizOptionResponse> Options { get; init; }
}

/// <summary>
/// Represents one lightweight quiz answer option attached to a wiki page.
/// </summary>
public sealed record WikiQuizOptionResponse
{
    /// <summary>
    /// Gets the option identifier.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the answer option text.
    /// </summary>
    public required string Text { get; init; }

    /// <summary>
    /// Gets whether this option is correct.
    /// </summary>
    public required bool IsCorrect { get; init; }

    /// <summary>
    /// Gets the manual display order inside the question.
    /// </summary>
    public required int SortOrder { get; init; }
}

/// <summary>
/// Represents one lightweight flashcard attached to a wiki page.
/// </summary>
public sealed record WikiFlashcardResponse
{
    /// <summary>
    /// Gets the flashcard identifier.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the front side.
    /// </summary>
    public required string Front { get; init; }

    /// <summary>
    /// Gets the back side.
    /// </summary>
    public required string Back { get; init; }

    /// <summary>
    /// Gets the manual display order inside the page.
    /// </summary>
    public required int SortOrder { get; init; }
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
