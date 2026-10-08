namespace Repetitio.Domain.Wiki;

public sealed class WikiStudySession
{
    public Guid Id { get; set; }
    public DateTime CompletedAt { get; set; }
    public ICollection<WikiStudyAnswer> Answers { get; set; } = [];
}

public sealed class WikiStudyAnswer
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public WikiStudySession? Session { get; set; }
    public Guid WikiPageId { get; set; }
    public WikiPage? WikiPage { get; set; }
    // Item IDs are historical references: editing a check must not delete its past results.
    public Guid ItemId { get; set; }
    public string Kind { get; set; } = "quiz";
    public bool IsCorrect { get; set; }
}

public sealed class WikiStudyProgress
{
    public Guid WikiPageId { get; set; }
    public WikiPage? WikiPage { get; set; }
    public string Kind { get; set; } = "quiz";
    public DateTime LastPracticedAt { get; set; }
    public DateTime? LastCompletedAt { get; set; }
}

public sealed class WikiStudySettings
{
    public int Id { get; set; } = 1;
    public int IntervalDays { get; set; } = 30;
}
