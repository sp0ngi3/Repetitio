namespace Repetitio.Domain.LearningItems;

/// <summary>
/// Describes the user's current progress state for a learning item.
/// </summary>
public enum LearningItemStatus
{
    /// <summary>
    /// The item has been created but not practiced yet.
    /// </summary>
    NotStarted = 1,

    /// <summary>
    /// The item has at least one partial or unfinished attempt.
    /// </summary>
    InProgress = 2,

    /// <summary>
    /// The item has been successfully completed at least once.
    /// </summary>
    Completed = 3,

    /// <summary>
    /// The item has been practiced enough to be considered mastered.
    /// </summary>
    Mastered = 4
}
