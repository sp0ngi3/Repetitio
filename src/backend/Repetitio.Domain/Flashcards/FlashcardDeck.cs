namespace Repetitio.Domain.Flashcards;

/// <summary>
/// Represents a saved flashcard learning session definition.
/// </summary>
public sealed class FlashcardDeck
{
    /// <summary>
    /// Gets or sets the unique deck identifier.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the deck name.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the optional deck description.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the default number of cards to review in one run.
    /// </summary>
    public int DefaultSessionSize { get; set; } = 25;

    /// <summary>
    /// Gets or sets the number of completed runs for this saved session.
    /// </summary>
    public int TotalRuns { get; set; }

    /// <summary>
    /// Gets or sets the date and time when this saved session was last practiced.
    /// </summary>
    public DateTime? LastPracticedAt { get; set; }

    /// <summary>
    /// Gets or sets the next review date for this saved session.
    /// </summary>
    public DateTime? NextReviewAt { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the deck was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the deck was last updated.
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Gets the flashcards selected for this deck.
    /// </summary>
    public ICollection<FlashcardDeckCard> Cards { get; } = new List<FlashcardDeckCard>();

    /// <summary>
    /// Gets the reviews submitted from this deck.
    /// </summary>
    public ICollection<FlashcardReview> Reviews { get; } = new List<FlashcardReview>();
}
