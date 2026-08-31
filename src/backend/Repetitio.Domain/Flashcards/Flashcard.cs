using Repetitio.Domain.LearningItems;

namespace Repetitio.Domain.Flashcards;

/// <summary>
/// Represents one flashcard with a question side and an explanation side.
/// </summary>
public sealed class Flashcard
{
    /// <summary>
    /// Gets or sets the related learning item identifier.
    /// </summary>
    public Guid LearningItemId { get; set; }

    /// <summary>
    /// Gets or sets the related learning item.
    /// </summary>
    public LearningItem LearningItem { get; set; } = null!;

    /// <summary>
    /// Gets or sets the question shown on the front side.
    /// </summary>
    public string Question { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the explanation shown after flipping the card.
    /// </summary>
    public string Explanation { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the optional source of the flashcard.
    /// </summary>
    public string? Source { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the flashcard was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the flashcard was last updated.
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Gets the saved deck memberships for this flashcard.
    /// </summary>
    public ICollection<FlashcardDeckCard> DeckCards { get; } = new List<FlashcardDeckCard>();

    /// <summary>
    /// Gets the review records for this flashcard.
    /// </summary>
    public ICollection<FlashcardReview> Reviews { get; } = new List<FlashcardReview>();
}
