namespace Repetitio.Application.Dsa;

/// <summary>
/// Provides the default DSA reflection template used by the frontend.
/// </summary>
public static class DsaProblemTemplate
{
    /// <summary>
    /// Gets the default problem statement template.
    /// </summary>
    public const string ProblemStatement = "Describe the problem in your own words.";

    /// <summary>
    /// Gets the default test cases template.
    /// </summary>
    public const string TestCases = "- Empty or minimum input\n- Typical case\n- Edge case\n- Large input";

    /// <summary>
    /// Gets the default assumptions template.
    /// </summary>
    public const string Assumptions = "List constraints, input shape, and edge cases before coding.";

    /// <summary>
    /// Gets the default approach template.
    /// </summary>
    public const string Approach = "Explain the mental model and algorithm before writing code.";

    /// <summary>
    /// Gets the default knowledge checklist template.
    /// </summary>
    public const string KnowledgeChecklist = "What should I know after solving this problem?";

    /// <summary>
    /// Gets the default self-question template.
    /// </summary>
    public const string QuestionsToAsk = "What question should I have asked myself during this problem?";

    /// <summary>
    /// Gets the default missed mental steps template.
    /// </summary>
    public const string MissedMentalSteps = "What mental steps did I miss?";
}
