using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Repetitio.Application.Wiki;
using Repetitio.Domain.Wiki;
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
            || request.Updates.Any(update => update is null || update.Id == Guid.Empty || update.Page is null)
            || request.Updates.Select(update => update.Id).Distinct().Count() != request.Updates.Count
            || !request.Updates.Any(update => update.Id == id && !update.IsNew))
            return Results.BadRequest("Provide the selected page and up to 500 unique page updates or new subpages.");
        try
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync();
            var root = await dbContext.WikiPages.FirstOrDefaultAsync(page => page.Id == id);
            if (root is null) return Results.NotFound();
            var ids = request.Updates.Select(update => update.Id).ToArray();
            var pages = await WikiPageDetailsQuery(dbContext).Where(page => ids.Contains(page.Id)).ToListAsync();
            var pagesById = pages.ToDictionary(page => page.Id);
            var updates = request.Updates.ToDictionary(update => update.Id);

            foreach (var update in request.Updates)
            {
                if (!EndpointValidation.HasText(update.Page.Title)) return Results.BadRequest("Each page needs a title.");
                var error = ValidateWikiSources(update.Page.Sources) ?? ValidateWikiPracticeInserts(update.Page.QuizQuestions, update.Page.Flashcards);
                if (error is not null) return Results.BadRequest(error);

                if (update.IsNew)
                {
                    if (pagesById.ContainsKey(update.Id))
                        return Results.Conflict("A new page ID already exists. Reload with Include subpages before saving again.");
                    continue;
                }
                if (!pagesById.TryGetValue(update.Id, out var page))
                    return Results.Conflict("An edited page was deleted. Reload the JSON before saving.");
                if (page.Id != id && !page.Path.StartsWith(root.Path + "/", StringComparison.Ordinal))
                    return Results.BadRequest("JSON edits may only update the selected page and its existing descendants.");
                if (page.UpdatedAt != update.ExpectedUpdatedAt)
                    return Results.Conflict($"'{page.Title}' changed since the JSON was copied. Reload before saving; no changes were applied.");
                if (update.Page.ParentId != page.ParentId)
                    return Results.BadRequest("Keep the original parentId of existing pages. New subpages can be added underneath them.");
            }

            // Resolve new parents before writing anything, rejecting cycles and references outside this edit.
            var newPages = new List<WikiJsonPageUpdate>();
            var pending = request.Updates.Where(update => update.IsNew).ToList();
            var availableParents = pagesById.Keys.ToHashSet();
            while (pending.Count > 0)
            {
                var ready = pending.Where(update => update.Page.ParentId is Guid parentId && availableParents.Contains(parentId)).ToArray();
                if (ready.Length == 0)
                    return Results.BadRequest("Every new subpage must connect to the selected article. Check parentId values for missing parents or cycles.");
                foreach (var update in ready)
                {
                    pending.Remove(update);
                    newPages.Add(update);
                    availableParents.Add(update.Id);
                }
            }

            if (!request.AllowImageRemoval)
            {
                var previousImages = CountEditImages(pages.Select(page => page.ContentMarkdown));
                var nextImages = CountEditImages(request.Updates.Select(update =>
                    update.Page.ContentMarkdown ?? pagesById.GetValueOrDefault(update.Id)?.ContentMarkdown ?? ""));
                if (previousImages.Any(image => nextImages.GetValueOrDefault(image.Key) < image.Value))
                    return Results.BadRequest("This edit lost an image reference. Keep it in the article or one of its edited subpages, or explicitly allow unlinking images.");
            }
            var imageIds = request.Updates.SelectMany(update => ImageCounts(update.Page.ContentMarkdown ?? "").Keys).Distinct().ToArray();
            if (await dbContext.WikiImages.CountAsync(image => imageIds.Contains(image.Id)) != imageIds.Length)
                return Results.BadRequest("A local image reference does not exist in this database. Keep the original wiki-image IDs.");

            var now = DateTime.UtcNow;
            var updatedCount = 0;
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
            foreach (var addition in newPages)
            {
                var update = addition.Page;
                var parent = pagesById[update.ParentId!.Value];
                var slug = await CreateUniqueSlugAsync(dbContext, update.Slug, update.Title, parent.Id, null);
                var page = new WikiPage
                {
                    Id = addition.Id, ParentId = parent.Id, Parent = parent,
                    Title = update.Title.Trim(), Slug = slug, Path = BuildPath(parent, slug), Depth = parent.Depth + 1,
                    SortOrder = Math.Clamp(update.SortOrder, 0, MaximumSortOrder), IsArchived = update.IsArchived,
                    Summary = TrimOptional(update.Summary), ContentMarkdown = TrimContent(update.ContentMarkdown),
                    CreatedAt = now, UpdatedAt = now
                };
                ApplyWikiSources(page, update.Sources, now);
                ApplyWikiPracticeInserts(page, update.QuizQuestions, update.Flashcards, now);
                dbContext.WikiPages.Add(page);
                await dbContext.SaveChangesAsync();
                pagesById.Add(page.Id, page);
            }
            await transaction.CommitAsync();
            return Results.Ok(new { updatedCount, createdCount = newPages.Count });
        }
        catch (DbUpdateConcurrencyException)
        { return Results.Conflict("A page changed while saving. Reload the JSON; this edit was not applied."); }
        catch (SqliteException error) when (error.SqliteErrorCode is 5 or 6)
        { return Results.Conflict("The Wiki is being updated elsewhere. Retry or reload your JSON; this edit was not applied."); }
        catch (DbUpdateException error) when (error.InnerException is SqliteException { SqliteErrorCode: 19 })
        { return Results.Conflict("A page ID or path was created elsewhere. Reload the JSON; this edit was not applied."); }
    }

    private static Dictionary<Guid, int> CountEditImages(IEnumerable<string> contents)
    {
        var counts = new Dictionary<Guid, int>();
        foreach (var content in contents)
        {
            foreach (var image in ImageCounts(content))
                counts[image.Key] = counts.GetValueOrDefault(image.Key) + image.Value;
        }
        return counts;
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
