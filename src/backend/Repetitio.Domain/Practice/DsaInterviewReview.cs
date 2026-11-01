namespace Repetitio.Domain.Practice;

/// <summary>Optional, immutable interview review captured for a single DSA attempt.</summary>
public sealed record DsaInterviewReview
{
    public bool RestatedProblem { get; init; }
    public bool AskedConstraints { get; init; }
    public bool DiscussedApproaches { get; init; }
    public bool StatedComplexity { get; init; }
    public bool ReceivedGoAhead { get; init; }
    public bool TalkedThroughCode { get; init; }
    public bool MeaningfulNames { get; init; }
    public bool CleanModularCode { get; init; }
    public bool HandledEdgeCases { get; init; }
    public bool WalkedThroughExample { get; init; }
    public bool TestedEdgeCases { get; init; }
    public bool FixedBugs { get; init; }
    public bool DiscussedOptimizations { get; init; }
    public int? ProblemSolving { get; init; }
    public int? Communication { get; init; }
    public int? Speed { get; init; }
    public int? Dsa { get; init; }
    public int? Coding { get; init; }

    public bool HasValidRatings() => new[] { ProblemSolving, Communication, Speed, Dsa, Coding }
        .All(rating => rating is null or >= 1 and <= 5);
}
