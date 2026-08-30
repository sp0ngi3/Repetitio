namespace Repetitio.Application.SystemDesign;

/// <summary>
/// Provides default markdown scaffolding for System Design problems.
/// </summary>
public static class SystemDesignProblemTemplate
{
    /// <summary>
    /// Gets the default prompt template.
    /// </summary>
    public const string PromptMarkdown = """
## Scenario
Design ...

## Goal
Support ...
""";

    /// <summary>
    /// Gets the default functional requirements template.
    /// </summary>
    public const string FunctionalRequirementsMarkdown = """
- Users can ...
- The system supports ...
- Admins can ...
""";

    /// <summary>
    /// Gets the default non-functional requirements template.
    /// </summary>
    public const string NonFunctionalRequirementsMarkdown = """
- Availability:
- Latency:
- Consistency:
- Durability:
""";

    /// <summary>
    /// Gets the default constraints template.
    /// </summary>
    public const string ConstraintsMarkdown = """
- Traffic assumptions:
- Data size:
- Read/write ratio:
- Out of scope:
""";

    /// <summary>
    /// Gets the default reflection template.
    /// </summary>
    public const string ReflectionMarkdown = """
## What went well

## Gaps

## Follow-up drills
""";
}
