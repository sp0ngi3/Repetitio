namespace Repetitio.Domain.Flashcards;

/// <summary>
/// Represents a flashcard selected into a saved deck.
/// </summary>
public sealed class FlashcardDeckCard
{
    /// <summary>
    /// Gets or sets the deck identifier.
    /// </summary>
    public Guid DeckId { get; set; }

    /// <summary>
    /// Gets or sets the related deck.
    /// </summary>
    public FlashcardDeck Deck { get; set; } = null!;

    /// <summary>
    /// Gets or sets the flashcard learning item identifier.
    /// </summary>
    public Guid FlashcardLearningItemId { get; set; }

    /// <summary>
    /// Gets or sets the selected flashcard.
    /// </summary>
    public Flashcard Flashcard { get; set; } = null!;

    /// <summary>
    /// Gets or sets the display order inside the deck.
    /// </summary>
    public int SortOrder { get; set; }
}
