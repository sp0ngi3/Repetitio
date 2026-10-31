using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Repetitio.Application.Wiki;
using Repetitio.Domain.Wiki;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Api.Endpoints;

public static partial class WikiEndpoints
{
    private static async Task<IResult> ChangeWikiPracticeItemAsync(
        RepetitioDbContext dbContext, Guid id, string kind, Guid itemId, ChangeWikiPracticeItemRequest request)
    {
        if (kind is not ("quiz" or "flashcard")) return Results.BadRequest("Unknown practice item type.");
        if (request.Delete ? request.Question is not null || request.Flashcard is not null
            : kind == "quiz" ? request.Question is null || request.Flashcard is not null
            : request.Flashcard is null || request.Question is not null)
            return Results.BadRequest("Provide only the selected practice item, or delete it without replacement content.");
        if (request.Question is { } question && (question.Options is null || question.Options.Any(option => option is null)))
            return Results.BadRequest("Quiz answers are required.");
        var error = ValidateWikiPracticeInserts(request.Question is null ? [] : [request.Question],
            request.Flashcard is null ? [] : [request.Flashcard]);
        if (error is not null) return Results.BadRequest(error);

        try
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync();
            var page = await WikiPageDetailsQuery(dbContext).FirstOrDefaultAsync(page => page.Id == id);
            if (page is null) return Results.NotFound();
            if (page.UpdatedAt != request.ExpectedUpdatedAt)
                return Results.Conflict("This article changed. Reopen this dialog before saving. No changes were applied.");
            var oldQuestion = page.QuizQuestions.FirstOrDefault(question => question.Id == itemId);
            var oldCard = page.Flashcards.FirstOrDefault(card => card.Id == itemId);
            if (kind == "quiz" ? oldQuestion is null : oldCard is null) return Results.NotFound("This check is no longer in this article.");

            var now = DateTime.UtcNow;
            Guid? replacementId = null;
            if (!request.Delete)
            {
                var replacement = new WikiPage { Id = page.Id };
                ApplyWikiPracticeInserts(replacement, request.Question is null ? [] : [request.Question],
                    request.Flashcard is null ? [] : [request.Flashcard], now);
                if (kind == "quiz")
                {
                    var fresh = replacement.QuizQuestions.Single();
                    var unchanged = fresh.Prompt == oldQuestion!.Prompt && fresh.Explanation == oldQuestion.Explanation
                        && fresh.Options.OrderBy(option => option.SortOrder).Select(option => (option.Text, option.IsCorrect))
                            .SequenceEqual(oldQuestion.Options.OrderBy(option => option.SortOrder).Select(option => (option.Text, option.IsCorrect)));
                    if (unchanged) return Results.Ok(new WikiPracticeItemChangeResponse(ToResponse(page, await dbContext.WikiPages.CountAsync(child => child.ParentId == id)), itemId));
                    fresh.SortOrder = oldQuestion.SortOrder;
                    fresh.CreatedAt = oldQuestion.CreatedAt;
                    page.QuizQuestions.Add(fresh);
                    dbContext.WikiQuizQuestions.Add(fresh);
                    replacementId = fresh.Id;
                }
                else
                {
                    var fresh = replacement.Flashcards.Single();
                    if (fresh.Front == oldCard!.Front && fresh.Back == oldCard.Back)
                        return Results.Ok(new WikiPracticeItemChangeResponse(ToResponse(page, await dbContext.WikiPages.CountAsync(child => child.ParentId == id)), itemId));
                    fresh.SortOrder = oldCard.SortOrder;
                    fresh.CreatedAt = oldCard.CreatedAt;
                    page.Flashcards.Add(fresh);
                    dbContext.WikiFlashcards.Add(fresh);
                    replacementId = fresh.Id;
                }
            }
            // A changed check starts fresh coverage; historical answers and every unrelated ID stay intact.
            if (kind == "quiz") { page.QuizQuestions.Remove(oldQuestion!); dbContext.WikiQuizQuestions.Remove(oldQuestion!); }
            else { page.Flashcards.Remove(oldCard!); dbContext.WikiFlashcards.Remove(oldCard!); }
            page.UpdatedAt = now;
            await dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
            return Results.Ok(new WikiPracticeItemChangeResponse(ToResponse(page, await dbContext.WikiPages.CountAsync(child => child.ParentId == id)), replacementId));
        }
        catch (SqliteException exception) when (exception.SqliteErrorCode is 5 or 6)
        {
            return Results.Conflict("The Wiki is being updated elsewhere. Your changes have not been applied. Retry saving.");
        }
        catch (DbUpdateConcurrencyException)
        {
            return Results.Conflict("This check changed elsewhere. No changes were applied. Reopen the dialog to load the latest version.");
        }
    }

    private static async Task<IResult> UpdateWikiPracticeAsync(
        RepetitioDbContext dbContext, Guid id, UpdateWikiPracticeRequest request)
    {
        // Omitted collections must never accidentally clear existing material.
        if (request.QuizQuestions is null || request.Flashcards is null
            || request.QuizQuestions.Any(question => question is null || question.Options is null
                || question.Options.Any(option => option is null))
            || request.Flashcards.Any(card => card is null))
            return Results.BadRequest("Provide both the quiz questions and flashcards, including their answer fields.");
        var error = ValidateWikiPracticeInserts(request.QuizQuestions, request.Flashcards);
        if (error is not null) return Results.BadRequest(error);

        try
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync();
            var page = await WikiPageDetailsQuery(dbContext).FirstOrDefaultAsync(page => page.Id == id);
            if (page is null) return Results.NotFound();
            if (page.UpdatedAt != request.ExpectedUpdatedAt)
                return Results.Conflict("This article changed since the editor was opened. Your draft has not been saved. Close and reopen the editor to load the latest material.");

            var now = DateTime.UtcNow;
            await ReplaceWikiPracticeInsertsAsync(dbContext, page, request.QuizQuestions, request.Flashcards, now);
            page.UpdatedAt = now;
            await dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
            var childCount = await dbContext.WikiPages.CountAsync(child => child.ParentId == id);
            return Results.Ok(ToResponse(page, childCount));
        }
        catch (SqliteException exception) when (exception.SqliteErrorCode is 5 or 6)
        {
            return Results.Conflict("The Wiki is being updated elsewhere. Retry saving your draft.");
        }
    }
}
