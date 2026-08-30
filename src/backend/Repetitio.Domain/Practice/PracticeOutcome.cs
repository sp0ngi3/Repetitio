namespace Repetitio.Domain.Practice;

/// <summary>
/// Describes the result of a practice session.
/// </summary>
public enum PracticeOutcome
{
    /// <summary>
    /// The attempt failed.
    /// </summary>
    Failed = 1,

    /// <summary>
    /// The attempt was partially completed.
    /// </summary>
    Partial = 2,

    /// <summary>
    /// The attempt was completed without automated pass or fail semantics.
    /// </summary>
    Completed = 3,

    /// <summary>
    /// The attempt passed expected validation.
    /// </summary>
    Passed = 4
}
