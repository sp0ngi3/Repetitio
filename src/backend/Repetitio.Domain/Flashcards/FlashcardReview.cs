using Repetitio.Domain.Practice;

namespace Repetitio.Domain.Flashcards;

/// <summary>
/// Represents one flashcard evaluation recorded during study.
/// </summary>
public sealed class FlashcardReview
{
    /// <summary>
    /// Gets or sets the unique review identifier.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the optional deck identifier used for the review.
    /// </summary>
    public Guid? DeckId { get; set; }

    /// <summary>
    /// Gets or sets the optional deck used for the review.
    /// </summary>
    public FlashcardDeck? Deck { get; set; }

    /// <summary>
    /// Gets or sets the reviewed flashcard learning item identifier.
    /// </summary>
    public Guid FlashcardLearningItemId { get; set; }

    /// <summary>
    /// Gets or sets the reviewed flashcard.
    /// </summary>
    public Flashcard Flashcard { get; set; } = null!;

    /// <summary>
    /// Gets or sets the practice session created for this review.
    /// </summary>
    public Guid PracticeSessionId { get; set; }

    /// <summary>
    /// Gets or sets the practice session created for this review.
    /// </summary>
    public PracticeSession PracticeSession { get; set; } = null!;

    /// <summary>
    /// Gets or sets a value indicating whether the answer was known before flipping.
    /// </summary>
    public bool KnewAnswer { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the review was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }
}
