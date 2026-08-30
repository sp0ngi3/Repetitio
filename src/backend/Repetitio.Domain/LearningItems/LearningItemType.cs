namespace Repetitio.Domain.LearningItems;

/// <summary>
/// Identifies the learning domain that a practiceable item belongs to.
/// </summary>
public enum LearningItemType
{
    /// <summary>
    /// A short implementation exercise focused on fundamentals.
    /// </summary>
    Basics = 1,

    /// <summary>
    /// A data structures and algorithms problem.
    /// </summary>
    Dsa = 2,

    /// <summary>
    /// A system design practice problem.
    /// </summary>
    SystemDesign = 3
}
