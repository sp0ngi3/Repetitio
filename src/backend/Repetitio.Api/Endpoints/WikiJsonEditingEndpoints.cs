using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Repetitio.Application.Wiki;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Api.Endpoints;

public static partial class WikiEndpoints
{
    private static readonly JsonSerializerOptions WikiJsonOptions = new(JsonSerializerDefaults.Web);

    [GeneratedRegex(@"(?:wiki-image:|/api/wiki/images/)([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})")]
    private static partial Regex WikiImageReferences();

    private static async Task<IResult> GetWikiJsonAsync(RepetitioDbContext dbContext, Guid id, bool includeChildren = false)
    {
        var root = await dbContext.WikiPages.AsNoTracking().FirstOrDefaultAsync(page => page.Id == id);
        if (root is null) return Results.NotFound();
        var query = WikiPageDetailsQuery(dbContext).AsNoTracking()
            .Where(page => page.Id == id || includeChildren && page.Path.StartsWith(root.Path + "/"));
        var pages = await query.OrderBy(page => page.Depth).ThenBy(page => page.SortOrder).ThenBy(page => page.Title)
            .Take(MaxBatchImportPageCount + 1).ToListAsync();
        if (pages.Count > MaxBatchImportPageCount)
            return Results.BadRequest($"Select a smaller branch. JSON editing supports at most {MaxBatchImportPageCount} pages at once.");
        var referencedIds = pages.SelectMany(page => ImageCounts(page.ContentMarkdown).Keys).Distinct().ToArray();
        var images = await dbContext.WikiImages.AsNoTracking().Where(image => referencedIds.Contains(image.Id))
            .Select(image => new { image.Id, image.FileName, image.ContentType, image.Sha256 }).ToDictionaryAsync(image => image.Id);
        var counts = await GetChildCountsAsync(dbContext, pages.Select(page => page.Id).ToArray());
        var nodes = pages.ToDictionary(page => page.Id, page =>
        {
            var node = JsonSerializer.SerializeToNode(ToResponse(page, counts.GetValueOrDefault(page.Id)), WikiJsonOptions)!.AsObject();
            node["children"] = new JsonArray();
            var references = WikiImageReferences().Matches(page.ContentMarkdown).Cast<Match>().GroupBy(match => Guid.Parse(match.Groups[1].Value));
            node["images"] = JsonSerializer.SerializeToNode(references.Select(group => new
            {
                id = group.Key,
                fileName = images.GetValueOrDefault(group.Key)?.FileName,
                reference = $"wiki-image:{group.Key}",
                url = $"/api/wiki/images/{group.Key}",
                sha256 = images.GetValueOrDefault(group.Key)?.Sha256,
                occurrences = group.Count(),
                lines = group.Select(match => page.ContentMarkdown.AsSpan(0, match.Index).Count('\n') + 1).ToArray()
            }), WikiJsonOptions);
            return node;
        });
        foreach (var page in pages.Where(page => page.Id != id))
        {
            if (page.ParentId is Guid parent && nodes.TryGetValue(parent, out var parentNode))
                parentNode["children"]!.AsArray().Add(nodes[page.Id]);
        }
        return Results.Json(new JsonObject { ["pages"] = new JsonArray(nodes[id]) });
    }

    private static Dictionary<Guid, int> ImageCounts(string content) => WikiImageReferences().Matches(content)
        .Cast<Match>().GroupBy(match => Guid.Parse(match.Groups[1].Value)).ToDictionary(group => group.Key, group => group.Count());

    private static async Task<IResult> UpdateWikiJsonAsync(RepetitioDbContext dbContext, Guid id, WikiJsonUpdateRequest request)
    {
        if (request.Updates is null || request.Updates.Count is 0 or > MaxBatchImportPageCount
            || request.Updates.Select(update => update.Id).Distinct().Count() != request.Updates.Count
            || !request.Updates.Any(update => update.Id == id))
            return Results.BadRequest("Provide the selected page and up to 500 unique page updates.");
        try
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync();
            var root = await dbContext.WikiPages.FirstOrDefaultAsync(page => page.Id == id);
            if (root is null) return Results.NotFound();
            var ids = request.Updates.Select(update => update.Id).ToArray();
            var pages = await WikiPageDetailsQuery(dbContext).Where(page => ids.Contains(page.Id)).ToListAsync();
            if (pages.Count != ids.Length) return Results.Conflict("An edited page was deleted. Reload the JSON before saving.");
            var updates = request.Updates.ToDictionary(update => update.Id);
            foreach (var page in pages)
            {
                var update = updates[page.Id];
                if (page.Id != id && !page.Path.StartsWith(root.Path + "/", StringComparison.Ordinal))
                    return Results.BadRequest("JSON edits may only update the selected page and its existing descendants.");
                if (page.UpdatedAt != update.ExpectedUpdatedAt)
                    return Results.Conflict($"'{page.Title}' changed since the JSON was copied. Reload before saving; no changes were applied.");
                if (update.Page is null || !EndpointValidation.HasText(update.Page.Title)) return Results.BadRequest("Each page needs a title.");
                if (update.Page.ParentId != page.ParentId)
                    return Results.BadRequest("JSON editing cannot move pages. Keep parentId and children in their original positions.");
                var error = ValidateWikiSources(update.Page.Sources) ?? ValidateWikiPracticeInserts(update.Page.QuizQuestions, update.Page.Flashcards);
                if (error is not null) return Results.BadRequest(error);
                if (!request.AllowImageRemoval)
                {
                    var next = ImageCounts(update.Page.ContentMarkdown ?? page.ContentMarkdown);
                    if (ImageCounts(page.ContentMarkdown).Any(image => next.GetValueOrDefault(image.Key) < image.Value))
                        return Results.BadRequest($"'{page.Title}' lost an image reference. Restore it or explicitly allow unlinking images.");
                }
            }
            var imageIds = request.Updates.SelectMany(update => ImageCounts(update.Page.ContentMarkdown ?? "").Keys).Distinct().ToArray();
            if (await dbContext.WikiImages.CountAsync(image => imageIds.Contains(image.Id)) != imageIds.Length)
                return Results.BadRequest("A local image reference does not exist in this database. Keep the original wiki-image IDs.");
            var now = DateTime.UtcNow;
            var updatedCount = 0;
            // Parent paths are saved first; the encompassing transaction keeps the whole edit atomic.
            foreach (var page in pages.OrderBy(page => page.Depth))
            {
                var update = updates[page.Id].Page;
                var current = WikiJsonCurrentPage(page);
                update = update with
                {
                    Title = update.Title.Trim(), Slug = update.Slug ?? page.Slug,
                    ContentMarkdown = TrimContent(update.ContentMarkdown ?? page.ContentMarkdown),
                    Summary = TrimOptional(update.Summary), SortOrder = Math.Clamp(update.SortOrder, 0, MaximumSortOrder),
                    Sources = update.Sources ?? current.Sources,
                    QuizQuestions = update.QuizQuestions ?? current.QuizQuestions,
                    Flashcards = update.Flashcards ?? current.Flashcards
                };
                if (JsonNode.DeepEquals(JsonSerializer.SerializeToNode(current, WikiJsonOptions), JsonSerializer.SerializeToNode(update, WikiJsonOptions))) continue;
                var parent = page.ParentId is Guid parentId ? await dbContext.WikiPages.FirstAsync(candidate => candidate.Id == parentId) : null;
                var slug = await CreateUniqueSlugAsync(dbContext, update.Slug ?? page.Slug, update.Title, page.ParentId, page.Id);
                var replaceSources = !JsonNode.DeepEquals(JsonSerializer.SerializeToNode(current.Sources, WikiJsonOptions), JsonSerializer.SerializeToNode(update.Sources, WikiJsonOptions));
                var replacePractice = !JsonNode.DeepEquals(JsonSerializer.SerializeToNode(current.QuizQuestions, WikiJsonOptions), JsonSerializer.SerializeToNode(update.QuizQuestions, WikiJsonOptions))
                    || !JsonNode.DeepEquals(JsonSerializer.SerializeToNode(current.Flashcards, WikiJsonOptions), JsonSerializer.SerializeToNode(update.Flashcards, WikiJsonOptions));
                await ApplyWikiPageUpdateAsync(dbContext, page, update, parent, slug, now, replaceSources, replacePractice);
                await dbContext.SaveChangesAsync();
                updatedCount++;
            }
            await transaction.CommitAsync();
            return Results.Ok(new { updatedCount });
        }
        catch (SqliteException error) when (error.SqliteErrorCode is 5 or 6)
        { return Results.Conflict("The Wiki is being updated elsewhere. Retry or reload your JSON; this edit was not applied."); }
    }

    private static UpdateWikiPageRequest WikiJsonCurrentPage(Repetitio.Domain.Wiki.WikiPage page)
    {
        var current = ToResponse(page, 0);
        return new UpdateWikiPageRequest
        {
            ParentId = page.ParentId, Title = page.Title, Slug = page.Slug, Summary = TrimOptional(page.Summary),
            ContentMarkdown = TrimContent(page.ContentMarkdown), SortOrder = page.SortOrder, IsArchived = page.IsArchived,
            Sources = current.Sources.Select(source => new WikiSourceRequest
            { Title = source.Title, Type = source.Type, Author = source.Author, Locator = source.Locator, Notes = source.Notes, Url = source.Url }).ToArray(),
            QuizQuestions = current.QuizQuestions.Select(question => new WikiQuizQuestionRequest
            { Prompt = question.Prompt, Explanation = question.Explanation, Options = question.Options.Select(option => new WikiQuizOptionRequest { Text = option.Text, IsCorrect = option.IsCorrect }).ToArray() }).ToArray(),
            Flashcards = current.Flashcards.Select(card => new WikiFlashcardRequest { Front = card.Front, Back = card.Back }).ToArray()
        };
    }
}
