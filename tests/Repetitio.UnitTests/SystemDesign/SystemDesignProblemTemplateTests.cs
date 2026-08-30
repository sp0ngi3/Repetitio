using Repetitio.Application.SystemDesign;

namespace Repetitio.UnitTests.SystemDesign;

/// <summary>
/// Tests for the default System Design problem template.
/// </summary>
public sealed class SystemDesignProblemTemplateTests
{
    /// <summary>
    /// Verifies that the System Design template contains the core interview sections.
    /// </summary>
    [Fact]
    public void Template_WhenRead_ContainsCoreSystemDesignSections()
    {
        Assert.Contains("Scenario", SystemDesignProblemTemplate.PromptMarkdown, StringComparison.Ordinal);
        Assert.Contains("Availability", SystemDesignProblemTemplate.NonFunctionalRequirementsMarkdown, StringComparison.Ordinal);
        Assert.Contains("Traffic assumptions", SystemDesignProblemTemplate.ConstraintsMarkdown, StringComparison.Ordinal);
        Assert.Contains("What went well", SystemDesignProblemTemplate.ReflectionMarkdown, StringComparison.Ordinal);
    }
}
