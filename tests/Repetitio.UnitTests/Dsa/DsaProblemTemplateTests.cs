using Repetitio.Application.Dsa;

namespace Repetitio.UnitTests.Dsa;

/// <summary>
/// Tests for the default DSA reflection template.
/// </summary>
public sealed class DsaProblemTemplateTests
{
    /// <summary>
    /// Verifies that the DSA template gives the frontend all expected reflection prompts.
    /// </summary>
    [Fact]
    public void Template_WhenRead_ContainsCoreReflectionPrompts()
    {
        Assert.Contains("own words", DsaProblemTemplate.ProblemStatement, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Edge case", DsaProblemTemplate.TestCases, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("mental model", DsaProblemTemplate.Approach, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("mental steps", DsaProblemTemplate.MissedMentalSteps, StringComparison.OrdinalIgnoreCase);
    }
}
