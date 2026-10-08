using Microsoft.EntityFrameworkCore;
using Repetitio.Application.Wiki;
using Repetitio.Domain.Wiki;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Infrastructure.Wiki;

public sealed class WikiStudyService(RepetitioDbContext db)
{
    public static bool IsEnabled(WikiPage page, IReadOnlyDictionary<Guid, WikiPage> pages)
    {
        if (!page.ReviewEnabled) return false;
        var seen = new HashSet<Guid>();
        WikiPage? current = page;
        while (current is not null && seen.Add(current.Id))
        {
            if (current.IsArchived) return false;
            current = current.ParentId is Guid parentId ? pages.GetValueOrDefault(parentId) : null;
        }
        return current is null;
    }

    public async Task<WikiStudyOverview> GetOverviewAsync()
    {
        var pages = await PageMetadataQuery().OrderBy(page => page.Path).ToListAsync();
        var questions = await db.WikiQuizQuestions.AsNoTracking().Select(q => new { q.Id, q.WikiPageId }).ToListAsync();
        var cards = await db.WikiFlashcards.AsNoTracking().Select(card => new { card.Id, card.WikiPageId }).ToListAsync();
        var questionIds = questions.ToLookup(q => q.WikiPageId, q => q.Id);
        var cardIds = cards.ToLookup(card => card.WikiPageId, card => card.Id);
        var pageById = pages.ToDictionary(page => page.Id);
        var progress = await db.WikiStudyProgress.AsNoTracking().ToListAsync();
        var progressByPage = progress.ToDictionary(state => (state.WikiPageId, state.Kind));
        var currentIds = questions.Select(q => q.Id).Concat(cards.Select(card => card.Id)).ToArray();
        var answers = await db.WikiStudyAnswers.AsNoTracking().Include(answer => answer.Session)
            .Where(answer => currentIds.Contains(answer.ItemId) && !db.WikiStudyAnswers.Any(newer =>
                newer.WikiPageId == answer.WikiPageId && newer.Kind == answer.Kind && newer.ItemId == answer.ItemId
                && newer.Session!.CompletedAt > answer.Session!.CompletedAt)).ToListAsync();
        var answersByPage = answers.ToLookup(answer => (answer.WikiPageId, answer.Kind));
        var interval = await GetIntervalAsync();
        var results = pages.Select(page => new WikiStudyPageProgress(page.Id, page.ParentId, page.Title,
            page.Path, page.IsArchived, page.ReviewEnabled, IsEnabled(page, pageById), page.ReviewIntervalDays,
            new[] { "quiz", "flashcard" }.Select(kind =>
            {
                var state = progressByPage.GetValueOrDefault((page.Id, kind));
                var ids = (kind == "quiz" ? questionIds[page.Id] : cardIds[page.Id]).ToHashSet();
                var latest = answersByPage[(page.Id, kind)].Where(a => ids.Contains(a.ItemId)
                        && (state?.LastCompletedAt is null || state.LastPracticedAt == state.LastCompletedAt || a.Session!.CompletedAt > state.LastCompletedAt))
                    .GroupBy(a => a.ItemId).Select(group => group.OrderByDescending(a => a.Session!.CompletedAt).First()).ToArray();
                return new WikiStudyModeProgress(kind, ids.Count, latest.Length, latest.Count(a => a.IsCorrect),
                    state?.LastPracticedAt, state?.LastCompletedAt,
                    IsEnabled(page, pageById) && ids.Count > 0 && state?.LastCompletedAt is DateTime completed
                        ? completed.AddDays(page.ReviewIntervalDays ?? interval) : null);
            }).ToArray())).ToArray();
        var history = await db.WikiStudySessions.AsNoTracking().OrderByDescending(session => session.CompletedAt)
            .Take(25).Select(session => new WikiStudyHistory(session.Id, session.CompletedAt,
                session.Answers.Count, session.Answers.Count(answer => answer.IsCorrect))).ToListAsync();
        return new WikiStudyOverview(interval, results, history);
    }

    public async Task<string?> SaveAsync(SaveWikiStudyRequest request)
    {
        if (request.Id == Guid.Empty || request.Answers is null || request.Answers.Count is 0 or > 5000)
            return "A session ID and between 1 and 5000 answers are required.";
        // The client reuses its ID for retries, so a saved session can never be counted twice.
        if (await db.WikiStudySessions.AnyAsync(session => session.Id == request.Id)) return null;
        if (request.Answers.Select(a => (a.ItemId, a.Kind)).Distinct().Count() != request.Answers.Count)
            return "A check may only be answered once in a session.";
        var pageById = (await PageMetadataQuery().ToListAsync()).ToDictionary(page => page.Id);
        var requestedPageIds = request.Answers.Select(answer => answer.PageId).Distinct().ToArray();
        var pages = await db.WikiPages.Where(page => requestedPageIds.Contains(page.Id))
            .Include(page => page.QuizQuestions).ThenInclude(q => q.Options)
            .Include(page => page.Flashcards).ToListAsync();
        foreach (var page in pages) pageById[page.Id] = page;
        var now = DateTime.UtcNow;
        var session = new WikiStudySession { Id = request.Id, CompletedAt = now };
        foreach (var input in request.Answers)
        {
            if (!pageById.TryGetValue(input.PageId, out var page)) return "A selected page no longer exists.";
            if (input.Kind is not ("quiz" or "flashcard")) return "Unknown check type.";
            bool correct;
            if (input.Kind == "quiz")
            {
                var option = page.QuizQuestions.FirstOrDefault(q => q.Id == input.ItemId)?.Options
                    .FirstOrDefault(o => o.Id == input.OptionId);
                if (option is null) return "A quiz changed during the session. Reload it before saving.";
                correct = option.IsCorrect;
            }
            else
            {
                if (input.Knew is null || !page.Flashcards.Any(card => card.Id == input.ItemId))
                    return "A flashcard changed or has not been graded.";
                correct = input.Knew.Value;
            }
            if (!IsEnabled(page, pageById)) continue;
            session.Answers.Add(new WikiStudyAnswer { Id = Guid.NewGuid(), WikiPageId = page.Id,
                ItemId = input.ItemId, Kind = input.Kind, IsCorrect = correct });
        }
        if (session.Answers.Count == 0) return null;
        await using var transaction = await db.Database.BeginTransactionAsync();
        foreach (var group in session.Answers.GroupBy(a => (a.WikiPageId, a.Kind)))
        {
            var state = await db.WikiStudyProgress.FindAsync(group.Key.WikiPageId, group.Key.Kind);
            if (state is null)
            {
                state = new WikiStudyProgress { WikiPageId = group.Key.WikiPageId, Kind = group.Key.Kind };
                db.WikiStudyProgress.Add(state);
            }
            var previous = await db.WikiStudyAnswers.Where(a => a.WikiPageId == group.Key.WikiPageId
                    && a.Kind == group.Key.Kind && (state.LastCompletedAt == null || a.Session!.CompletedAt > state.LastCompletedAt))
                .Select(a => a.ItemId).Distinct().ToListAsync();
            var covered = previous.Concat(group.Select(a => a.ItemId)).ToHashSet();
            state.LastPracticedAt = now;
            if (ItemIds(pageById[group.Key.WikiPageId], group.Key.Kind).IsSubsetOf(covered)) state.LastCompletedAt = now;
        }
        db.WikiStudySessions.Add(session);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return null;
    }

    public async Task<int> GetIntervalAsync() =>
        (await db.WikiStudySettings.AsNoTracking().FirstOrDefaultAsync(settings => settings.Id == 1))?.IntervalDays ?? 30;

    private IQueryable<WikiPage> PageMetadataQuery() => db.WikiPages.AsNoTracking().Select(page => new WikiPage
    {
        Id = page.Id, ParentId = page.ParentId, Title = page.Title, Path = page.Path,
        IsArchived = page.IsArchived, ReviewEnabled = page.ReviewEnabled, ReviewIntervalDays = page.ReviewIntervalDays
    });

    private static HashSet<Guid> ItemIds(WikiPage page, string kind) => kind == "quiz"
        ? page.QuizQuestions.Select(q => q.Id).ToHashSet() : page.Flashcards.Select(card => card.Id).ToHashSet();
}
