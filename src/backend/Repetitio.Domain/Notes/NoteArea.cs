namespace Repetitio.Domain.Notes;

/// <summary>
/// Identifies the notebook area a note page belongs to.
/// </summary>
public enum NoteArea
{
    /// <summary>
    /// Notes used while practicing data structures and algorithms.
    /// </summary>
    Dsa = 1,

    /// <summary>
    /// Notes used while practicing system design.
    /// </summary>
    SystemDesign = 2,

    /// <summary>
    /// General notes that do not belong to a specific learning area.
    /// </summary>
    Other = 3
}
