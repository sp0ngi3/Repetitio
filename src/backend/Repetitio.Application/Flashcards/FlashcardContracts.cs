using Repetitio.Application.Practice;
using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.Flashcards;

/// <summary>
/// Represents the request payload for creating a flashcard.
/// </summary>
public record CreateFlashcardRequest
{
    /// <summary>
    /// Gets the flashcard title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the question shown on the front side.
    /// </summary>
    public required string Question { get; init; }

    /// <summary>
    /// Gets the explanation shown on the back side.
    /// </summary>
    public required string Explanation { get; init; }

    /// <summary>
    /// Gets the optional source of the flashcard.
    /// </summary>
    public string? Source { get; init; }

    /// <summary>
    /// Gets the optional short description.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Gets the flashcard difficulty.
    /// </summary>
    public LearningDifficulty Difficulty { get; init; } = LearningDifficulty.Unknown;

    /// <summary>
    /// Gets the tag names assigned to the flashcard.
    /// </summary>
    public IReadOnlyCollection<string> Tags { get; init; } = [];
}

/// <summary>
/// Represents the request payload for updating a flashcard.
/// </summary>
public sealed record UpdateFlashcardRequest : CreateFlashcardRequest
{
    /// <summary>
    /// Gets the current progress status.
    /// </summary>
    public LearningItemStatus Status { get; init; } = LearningItemStatus.NotStarted;

    /// <summary>
    /// Gets the current confidence value from 1 to 5.
    /// </summary>
    public int? Confidence { get; init; }
}

/// <summary>
/// Represents a flashcard returned by the API.
/// </summary>
public sealed record FlashcardResponse
{
    /// <summary>
    /// Gets the related learning item identifier.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the flashcard title.
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Gets the optional short description.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Gets the question shown on the front side.
    /// </summary>
    public required string Question { get; init; }

    /// <summary>
    /// Gets the explanation shown on the back side.
    /// </summary>
    public required string Explanation { get; init; }

    /// <summary>
    /// Gets the optional source of the flashcard.
    /// </summary>
    public string? Source { get; init; }

    /// <summary>
    /// Gets the current progress status.
    /// </summary>
    public required LearningItemStatus Status { get; init; }

    /// <summary>
    /// Gets the flashcard difficulty.
    /// </summary>
    public required LearningDifficulty Difficulty { get; init; }

    /// <summary>
    /// Gets the current confidence value from 1 to 5.
    /// </summary>
    public int? Confidence { get; init; }

    /// <summary>
    /// Gets the date and time when the flashcard was last practiced.
    /// </summary>
    public DateTime? LastPracticedAt { get; init; }

    /// <summary>
    /// Gets the next review date and time.
    /// </summary>
    public DateTime? NextReviewAt { get; init; }

    /// <summary>
    /// Gets the assigned tag names.
    /// </summary>
    public required IReadOnlyCollection<string> Tags { get; init; }

    /// <summary>
    /// Gets the number of recorded reviews.
    /// </summary>
    public required int TotalReviews { get; init; }

    /// <summary>
    /// Gets the number of known reviews.
    /// </summary>
    public required int KnownReviews { get; init; }

    /// <summary>
    /// Gets the practice sessions recorded for this flashcard.
    /// </summary>
    public required IReadOnlyCollection<PracticeSessionResponse> PracticeSessions { get; init; }
}

/// <summary>
/// Represents a paged flashcard list returned by the API.
/// </summary>
public sealed record PagedFlashcardResponse
{
    /// <summary>
    /// Gets the flashcards on the current page.
    /// </summary>
    public required IReadOnlyCollection<FlashcardResponse> Items { get; init; }

    /// <summary>
    /// Gets the total number of matching flashcards.
    /// </summary>
    public required int TotalCount { get; init; }

    /// <summary>
    /// Gets the current one-based page number.
    /// </summary>
    public required int Page { get; init; }

    /// <summary>
    /// Gets the number of flashcards requested per page.
    /// </summary>
    public required int PageSize { get; init; }
}

/// <summary>
/// Represents the request payload for creating or updating a saved flashcard deck.
/// </summary>
public sealed record SaveFlashcardDeckRequest
{
    /// <summary>
    /// Gets the deck name.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Gets the optional deck description.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Gets the default number of cards to review in one run.
    /// </summary>
    public int DefaultSessionSize { get; init; } = 25;

    /// <summary>
    /// Gets the selected flashcard identifiers.
    /// </summary>
    public IReadOnlyCollection<Guid> FlashcardIds { get; init; } = [];
}

/// <summary>
/// Represents a saved flashcard deck returned by the API.
/// </summary>
public sealed record FlashcardDeckResponse
{
    /// <summary>
    /// Gets the deck identifier.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the deck name.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Gets the optional deck description.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Gets the selected flashcards.
    /// </summary>
    public required IReadOnlyCollection<FlashcardResponse> Cards { get; init; }

    /// <summary>
    /// Gets the default number of cards to review in one run.
    /// </summary>
    public required int DefaultSessionSize { get; init; }

    /// <summary>
    /// Gets the number of completed runs for this saved session.
    /// </summary>
    public required int TotalRuns { get; init; }

    /// <summary>
    /// Gets the number of card reviews submitted from this saved session.
    /// </summary>
    public required int TotalReviews { get; init; }

    /// <summary>
    /// Gets the number of known answers submitted from this saved session.
    /// </summary>
    public required int KnownReviews { get; init; }

    /// <summary>
    /// Gets the date and time when this saved session was last practiced.
    /// </summary>
    public DateTime? LastPracticedAt { get; init; }

    /// <summary>
    /// Gets the next review date for this saved session.
    /// </summary>
    public DateTime? NextReviewAt { get; init; }

    /// <summary>
    /// Gets the date and time when the deck was created.
    /// </summary>
    public required DateTime CreatedAt { get; init; }

    /// <summary>
    /// Gets the date and time when the deck was last updated.
    /// </summary>
    public required DateTime UpdatedAt { get; init; }
}

/// <summary>
/// Represents a saved flashcard learning session summary returned by list endpoints.
/// </summary>
public sealed record FlashcardDeckSummaryResponse
{
    /// <summary>
    /// Gets the deck identifier.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the deck name.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Gets the optional deck description.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Gets the number of selected flashcards.
    /// </summary>
    public required int CardCount { get; init; }

    /// <summary>
    /// Gets the default number of cards to review in one run.
    /// </summary>
    public required int DefaultSessionSize { get; init; }

    /// <summary>
    /// Gets the number of completed runs for this saved session.
    /// </summary>
    public required int TotalRuns { get; init; }

    /// <summary>
    /// Gets the number of card reviews submitted from this saved session.
    /// </summary>
    public required int TotalReviews { get; init; }

    /// <summary>
    /// Gets the number of known answers submitted from this saved session.
    /// </summary>
    public required int KnownReviews { get; init; }

    /// <summary>
    /// Gets the date and time when this saved session was last practiced.
    /// </summary>
    public DateTime? LastPracticedAt { get; init; }

    /// <summary>
    /// Gets the next review date for this saved session.
    /// </summary>
    public DateTime? NextReviewAt { get; init; }

    /// <summary>
    /// Gets the date and time when the deck was created.
    /// </summary>
    public required DateTime CreatedAt { get; init; }

    /// <summary>
    /// Gets the date and time when the deck was last updated.
    /// </summary>
    public required DateTime UpdatedAt { get; init; }
}

/// <summary>
/// Represents a paged saved flashcard learning session list returned by the API.
/// </summary>
public sealed record PagedFlashcardDeckResponse
{
    /// <summary>
    /// Gets the saved learning sessions on the current page.
    /// </summary>
    public required IReadOnlyCollection<FlashcardDeckSummaryResponse> Items { get; init; }

    /// <summary>
    /// Gets the total number of matching saved learning sessions.
    /// </summary>
    public required int TotalCount { get; init; }

    /// <summary>
    /// Gets the current one-based page number.
    /// </summary>
    public required int Page { get; init; }

    /// <summary>
    /// Gets the number of saved learning sessions requested per page.
    /// </summary>
    public required int PageSize { get; init; }
}

/// <summary>
/// Represents one flashcard result submitted after a learning session.
/// </summary>
public sealed record CompleteFlashcardReviewRequest
{
    /// <summary>
    /// Gets the reviewed flashcard identifier.
    /// </summary>
    public required Guid FlashcardId { get; init; }

    /// <summary>
    /// Gets a value indicating whether the answer was known.
    /// </summary>
    public required bool KnewAnswer { get; init; }

    /// <summary>
    /// Gets the optional confidence value from 1 to 5.
    /// </summary>
    public int? Confidence { get; init; }
}

/// <summary>
/// Represents the payload submitted after a flashcard learning session.
/// </summary>
public sealed record CompleteFlashcardSessionRequest
{
    /// <summary>
    /// Gets the optional deck identifier used for the session.
    /// </summary>
    public Guid? DeckId { get; init; }

    /// <summary>
    /// Gets optional notes for each created practice session.
    /// </summary>
    public string? Notes { get; init; }

    /// <summary>
    /// Gets the completed flashcard review results.
    /// </summary>
    public IReadOnlyCollection<CompleteFlashcardReviewRequest> Reviews { get; init; } = [];
}

/// <summary>
/// Represents the response after a flashcard learning session is saved.
/// </summary>
public sealed record CompleteFlashcardSessionResponse
{
    /// <summary>
    /// Gets the number of saved reviews.
    /// </summary>
    public required int SavedReviews { get; init; }

    /// <summary>
    /// Gets the number of known answers.
    /// </summary>
    public required int KnownAnswers { get; init; }

    /// <summary>
    /// Gets the number of missed answers.
    /// </summary>
    public required int MissedAnswers { get; init; }
}
