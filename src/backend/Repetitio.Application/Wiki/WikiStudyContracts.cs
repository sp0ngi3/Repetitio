namespace Repetitio.Application.Wiki;

public sealed record SaveWikiStudyRequest(Guid Id, IReadOnlyList<WikiStudyAnswerRequest> Answers);
public sealed record WikiStudyAnswerRequest(Guid PageId, Guid ItemId, string Kind, Guid? OptionId, bool? Knew);
public sealed record WikiReviewPreferenceRequest(bool Enabled, bool IncludeDescendants, int? IntervalDays);
public sealed record WikiStudySettingsRequest(int IntervalDays);
public sealed record WikiStudyModeProgress(string Kind, int Total, int Covered, int Correct,
    DateTime? LastPracticedAt, DateTime? LastCompletedAt, DateTime? NextReviewAt);
public sealed record WikiStudyPageProgress(Guid Id, Guid? ParentId, string Title, string Path,
    bool IsArchived, bool ReviewEnabled, bool EffectiveReviewEnabled, int? IntervalDays,
    IReadOnlyList<WikiStudyModeProgress> Modes);
public sealed record WikiStudyHistory(Guid Id, DateTime CompletedAt, int Answered, int Correct);
public sealed record WikiStudyOverview(int IntervalDays, IReadOnlyList<WikiStudyPageProgress> Pages,
    IReadOnlyList<WikiStudyHistory> History);
