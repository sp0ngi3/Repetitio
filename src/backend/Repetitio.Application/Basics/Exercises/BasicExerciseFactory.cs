using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.Basics.Exercises;

/// <summary>
/// Creates Basics exercise definitions with the shared default language.
/// </summary>
internal static class BasicExerciseFactory
{
    /// <summary>
    /// Creates a C# Basics exercise definition.
    /// </summary>
    /// <param name="slug">The stable exercise slug.</param>
    /// <param name="title">The exercise title.</param>
    /// <param name="difficulty">The exercise difficulty.</param>
    /// <param name="instructions">The compact exercise instructions.</param>
    /// <param name="problemStatement">The LeetCode-style problem statement.</param>
    /// <param name="examples">The worked examples.</param>
    /// <param name="constraints">The input constraints.</param>
    /// <param name="testCases">The automated test cases description.</param>
    /// <param name="approachGuide">The intended approach guide.</param>
    /// <param name="functionSignature">The expected function signature.</param>
    /// <param name="tags">The exercise tags.</param>
    /// <param name="starterCode">The starter code.</param>
    /// <param name="referenceSolution">The reference solution.</param>
    /// <returns>The Basics exercise definition.</returns>
    public static BasicExerciseResponse Create(
        string slug,
        string title,
        LearningDifficulty difficulty,
        string instructions,
        string problemStatement,
        string examples,
        string constraints,
        string testCases,
        string approachGuide,
        string functionSignature,
        IReadOnlyCollection<string> tags,
        string starterCode,
        string referenceSolution)
    {
        return new BasicExerciseResponse
        {
            Slug = slug,
            Title = title,
            Language = "C#",
            Difficulty = difficulty,
            Instructions = instructions,
            ProblemStatement = problemStatement,
            Examples = examples,
            Constraints = constraints,
            TestCases = testCases,
            ApproachGuide = approachGuide,
            FunctionSignature = functionSignature,
            Tags = tags,
            StarterCode = starterCode,
            ReferenceSolution = referenceSolution
        };
    }
}
