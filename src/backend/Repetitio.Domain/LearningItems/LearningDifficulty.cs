namespace Repetitio.Domain.LearningItems;

/// <summary>
/// Represents the rough difficulty of a learning item.
/// </summary>
public enum LearningDifficulty
{
    /// <summary>
    /// Difficulty has not been assigned yet.
    /// </summary>
    Unknown = 0,

    /// <summary>
    /// An easy item.
    /// </summary>
    Easy = 1,

    /// <summary>
    /// A medium item.
    /// </summary>
    Medium = 2,

    /// <summary>
    /// A hard item.
    /// </summary>
    Hard = 3
}
