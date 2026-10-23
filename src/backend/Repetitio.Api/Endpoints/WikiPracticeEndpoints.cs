using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Repetitio.Application.Wiki;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Api.Endpoints;

public static partial class WikiEndpoints
{
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
