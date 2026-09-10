namespace Repetitio.Domain.Wiki;

/// <summary>
/// Represents one answer option for a wiki quiz question.
/// </summary>
public sealed class WikiQuizOption
{
    /// <summary>
    /// Gets or sets the option identifier.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the parent quiz question identifier.
    /// </summary>
    public Guid WikiQuizQuestionId { get; set; }

    /// <summary>
    /// Gets or sets the parent quiz question.
    /// </summary>
    public WikiQuizQuestion? WikiQuizQuestion { get; set; }

    /// <summary>
    /// Gets or sets the answer option text.
    /// </summary>
    public string Text { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets whether this option is correct.
    /// </summary>
    public bool IsCorrect { get; set; }

    /// <summary>
    /// Gets or sets the manual display order inside the question.
    /// </summary>
    public int SortOrder { get; set; }
}
