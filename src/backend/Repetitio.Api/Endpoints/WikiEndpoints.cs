using System.Text;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Repetitio.Application.Wiki;
using Repetitio.Domain.Wiki;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Api.Endpoints;

/// <summary>
/// Maps wiki repository API endpoints.
/// </summary>
public static class WikiEndpoints
{
    private const int MaxBatchImportPageCount = 500;
    private const int MaximumSortOrder = 100000;
    private const string UpdatedNewestSort = "updated-newest";
    private const string UpdatedOldestSort = "updated-oldest";
    private const string TitleSort = "title";
    private const string TreeSort = "tree";

    /// <summary>
    /// Adds wiki repository endpoints to the application.
    /// </summary>
    /// <param name="app">The endpoint route builder.</param>
    /// <returns>The same endpoint route builder for chaining.</returns>
    public static IEndpointRouteBuilder MapWikiEndpoints(this IEndpointRouteBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);

        var group = app.MapGroup("/api/wiki").WithTags("Wiki");

        group.MapGet("/", GetWikiPagesAsync).WithName("GetWikiPages");
        group.MapGet("/tree", GetWikiTreeAsync).WithName("GetWikiTree");
        group.MapGet("/{id:guid}", GetWikiPageAsync).WithName("GetWikiPage");
        group.MapPost("/", CreateWikiPageAsync).WithName("CreateWikiPage");
        group.MapPost("/batch", ImportWikiPagesAsync).WithName("ImportWikiPages");
        group.MapPut("/{id:guid}", UpdateWikiPageAsync).WithName("UpdateWikiPage");
        group.MapDelete("/{id:guid}", DeleteWikiPageAsync).WithName("DeleteWikiPage");

        return app;
    }

    /// <summary>
    /// Returns wiki pages with optional search and pagination.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="search">The optional text search.</param>
    /// <param name="parentId">The optional parent page filter.</param>
    /// <param name="includeArchived">Whether archived pages are included.</param>
    /// <param name="sort">The requested sort mode.</param>
    /// <param name="page">The one-based page number.</param>
    /// <param name="pageSize">The number of wiki pages per page.</param>
    /// <returns>The paged wiki page responses.</returns>
    private static async Task<IResult> GetWikiPagesAsync(
        RepetitioDbContext dbContext,
        string? search,
        Guid? parentId,
        bool includeArchived = false,
        string? sort = null,
        int page = 1,
        int pageSize = 20)
    {
        var query = dbContext.WikiPages.AsNoTracking().AsQueryable();

        if (!includeArchived)
        {
            query = query.Where(wikiPage => !wikiPage.IsArchived);
        }

        if (parentId is not null)
        {
            query = query.Where(wikiPage => wikiPage.ParentId == parentId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var matchingIds = await SearchWikiPageIdsAsync(dbContext, search);

            if (matchingIds.Count > 0)
            {
                query = query.Where(wikiPage => matchingIds.Contains(wikiPage.Id));
            }
            else
            {
                var normalizedSearch = search.Trim();
                query = query.Where(wikiPage =>
                    wikiPage.Title.Contains(normalizedSearch)
                    || wikiPage.Path.Contains(normalizedSearch)
                    || (wikiPage.Summary != null && wikiPage.Summary.Contains(normalizedSearch))
                    || wikiPage.ContentMarkdown.Contains(normalizedSearch));
            }
        }

        var normalizedPage = NormalizePage(page);
        var normalizedPageSize = NormalizePageSize(pageSize);
        var totalCount = await query.CountAsync();
        var pages = await ApplySort(query, sort)
            .Skip((normalizedPage - 1) * normalizedPageSize)
            .Take(normalizedPageSize)
            .ToListAsync();
        var childCounts = await GetChildCountsAsync(dbContext, pages.Select(wikiPage => wikiPage.Id).ToArray());

        return Results.Ok(new PagedWikiPageResponse
        {
            Items = pages.Select(wikiPage => ToResponse(wikiPage, childCounts.GetValueOrDefault(wikiPage.Id))).ToArray(),
            TotalCount = totalCount,
            Page = normalizedPage,
            PageSize = normalizedPageSize
        });
    }

    /// <summary>
    /// Returns the full wiki navigation tree.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="includeArchived">Whether archived pages are included.</param>
    /// <returns>The wiki tree nodes in display order.</returns>
    private static async Task<IResult> GetWikiTreeAsync(RepetitioDbContext dbContext, bool includeArchived = false)
    {
        var query = dbContext.WikiPages.AsNoTracking().AsQueryable();

        if (!includeArchived)
        {
            query = query.Where(wikiPage => !wikiPage.IsArchived);
        }

        var pages = await query
            .OrderBy(wikiPage => wikiPage.Path)
            .ThenBy(wikiPage => wikiPage.SortOrder)
            .ThenBy(wikiPage => wikiPage.Title)
            .ToListAsync();

        return Results.Ok(pages.Select(ToTreeNodeResponse).ToArray());
    }

    /// <summary>
    /// Returns one wiki page.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The wiki page identifier.</param>
    /// <returns>The wiki page response when found.</returns>
    private static async Task<IResult> GetWikiPageAsync(RepetitioDbContext dbContext, Guid id)
    {
        var wikiPage = await dbContext.WikiPages.AsNoTracking().FirstOrDefaultAsync(page => page.Id == id);

        if (wikiPage is null)
        {
            return Results.NotFound();
        }

        var childCount = await dbContext.WikiPages.CountAsync(page => page.ParentId == id);

        return Results.Ok(ToResponse(wikiPage, childCount));
    }

    /// <summary>
    /// Creates a wiki page.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="request">The create request.</param>
    /// <returns>The created wiki page response.</returns>
    private static async Task<IResult> CreateWikiPageAsync(RepetitioDbContext dbContext, CreateWikiPageRequest request)
    {
        if (!EndpointValidation.HasText(request.Title))
        {
            return Results.BadRequest("Title is required.");
        }

        var parent = request.ParentId is null
            ? null
            : await dbContext.WikiPages.FirstOrDefaultAsync(page => page.Id == request.ParentId);

        if (request.ParentId is not null && parent is null)
        {
            return Results.BadRequest("Parent wiki page does not exist.");
        }

        var now = DateTime.UtcNow;
        var slug = await CreateUniqueSlugAsync(dbContext, request.Slug, request.Title, request.ParentId, null);
        var wikiPage = new WikiPage
        {
            Id = Guid.NewGuid(),
            ParentId = request.ParentId,
            Title = request.Title.Trim(),
            Slug = slug,
            Path = BuildPath(parent, slug),
            Depth = parent is null ? 0 : parent.Depth + 1,
            SortOrder = await GetNextSortOrderAsync(dbContext, request.ParentId),
            Summary = TrimOptional(request.Summary),
            ContentMarkdown = TrimContent(request.ContentMarkdown),
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.WikiPages.Add(wikiPage);
        await dbContext.SaveChangesAsync();

        return Results.Created($"/api/wiki/{wikiPage.Id}", ToResponse(wikiPage, 0));
    }

    /// <summary>
    /// Imports multiple wiki pages from a nested JSON tree.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="request">The batch import request.</param>
    /// <returns>The batch import summary.</returns>
    private static async Task<IResult> ImportWikiPagesAsync(RepetitioDbContext dbContext, ImportWikiPagesRequest request)
    {
        if (request.Pages.Count == 0)
        {
            return Results.BadRequest("At least one wiki page is required.");
        }

        var requestedPageCount = CountImportNodes(request.Pages);

        if (requestedPageCount > MaxBatchImportPageCount)
        {
            return Results.BadRequest($"A single wiki import can contain at most {MaxBatchImportPageCount} pages.");
        }

        var validationError = ValidateImportNodes(request.Pages);

        if (validationError is not null)
        {
            return Results.BadRequest(validationError);
        }

        var parent = request.ParentId is null
            ? null
            : await dbContext.WikiPages.FirstOrDefaultAsync(page => page.Id == request.ParentId);

        if (request.ParentId is not null && parent is null)
        {
            return Results.BadRequest("Parent wiki page does not exist.");
        }

        var now = DateTime.UtcNow;
        var reservedSlugsByParent = new Dictionary<string, HashSet<string>>();
        var createdPages = new List<WikiPage>(requestedPageCount);
        var rootPages = new List<WikiPage>();

        await using var transaction = await dbContext.Database.BeginTransactionAsync();
        await ImportWikiNodesAsync(
            dbContext,
            request.Pages,
            parent,
            request.ParentId,
            now,
            reservedSlugsByParent,
            createdPages,
            rootPages,
            true);

        await dbContext.SaveChangesAsync();
        await transaction.CommitAsync();

        return Results.Ok(new ImportWikiPagesResponse
        {
            ImportedCount = createdPages.Count,
            RootPages = rootPages.Select(page => ToResponse(page, page.Children.Count)).ToArray()
        });
    }

    /// <summary>
    /// Updates a wiki page and refreshes descendant paths when needed.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The wiki page identifier.</param>
    /// <param name="request">The update request.</param>
    /// <returns>The updated wiki page response when found.</returns>
    private static async Task<IResult> UpdateWikiPageAsync(
        RepetitioDbContext dbContext,
        Guid id,
        UpdateWikiPageRequest request)
    {
        if (!EndpointValidation.HasText(request.Title))
        {
            return Results.BadRequest("Title is required.");
        }

        var wikiPage = await dbContext.WikiPages.FirstOrDefaultAsync(page => page.Id == id);

        if (wikiPage is null)
        {
            return Results.NotFound();
        }

        if (request.ParentId == id)
        {
            return Results.BadRequest("A wiki page cannot be its own parent.");
        }

        var parent = request.ParentId is null
            ? null
            : await dbContext.WikiPages.FirstOrDefaultAsync(page => page.Id == request.ParentId);

        if (request.ParentId is not null && parent is null)
        {
            return Results.BadRequest("Parent wiki page does not exist.");
        }

        if (parent is not null && parent.Path.StartsWith($"{wikiPage.Path}/", StringComparison.OrdinalIgnoreCase))
        {
            return Results.BadRequest("A wiki page cannot be moved under its own descendant.");
        }

        var oldPath = wikiPage.Path;
        var oldDepth = wikiPage.Depth;
        var slug = await CreateUniqueSlugAsync(dbContext, request.Slug, request.Title, request.ParentId, id);
        var newPath = BuildPath(parent, slug);
        var newDepth = parent is null ? 0 : parent.Depth + 1;
        var now = DateTime.UtcNow;

        wikiPage.ParentId = request.ParentId;
        wikiPage.Title = request.Title.Trim();
        wikiPage.Slug = slug;
        wikiPage.Path = newPath;
        wikiPage.Depth = newDepth;
        wikiPage.SortOrder = Math.Clamp(request.SortOrder, 0, MaximumSortOrder);
        wikiPage.Summary = TrimOptional(request.Summary);
        wikiPage.ContentMarkdown = TrimContent(request.ContentMarkdown);
        wikiPage.IsArchived = request.IsArchived;
        wikiPage.UpdatedAt = now;

        if (!string.Equals(oldPath, newPath, StringComparison.Ordinal) || oldDepth != newDepth)
        {
            await UpdateDescendantPathsAsync(dbContext, oldPath, newPath, oldDepth, newDepth, now);
        }

        await dbContext.SaveChangesAsync();

        var childCount = await dbContext.WikiPages.CountAsync(page => page.ParentId == id);
        return Results.Ok(ToResponse(wikiPage, childCount));
    }

    /// <summary>
    /// Deletes a wiki page and all descendant pages.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The wiki page identifier.</param>
    /// <returns>No content when the page was deleted.</returns>
    private static async Task<IResult> DeleteWikiPageAsync(RepetitioDbContext dbContext, Guid id)
    {
        var wikiPage = await dbContext.WikiPages.FirstOrDefaultAsync(page => page.Id == id);

        if (wikiPage is null)
        {
            return Results.NotFound();
        }

        var pagesToDelete = await dbContext.WikiPages
            .Where(page => page.Id == id || page.Path.StartsWith($"{wikiPage.Path}/"))
            .ToListAsync();

        dbContext.WikiPages.RemoveRange(pagesToDelete);
        await dbContext.SaveChangesAsync();

        return Results.NoContent();
    }

    /// <summary>
    /// Uses the SQLite FTS index to find matching wiki page identifiers.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="search">The raw search value.</param>
    /// <returns>Matching wiki page identifiers ordered by search rank.</returns>
    private static async Task<IReadOnlyCollection<Guid>> SearchWikiPageIdsAsync(RepetitioDbContext dbContext, string search)
    {
        var ftsQuery = BuildFtsQuery(search);

        if (ftsQuery.Length == 0)
        {
            return [];
        }

        var ids = new List<Guid>();
        var connection = dbContext.Database.GetDbConnection();
        var shouldClose = connection.State != System.Data.ConnectionState.Open;

        if (shouldClose)
        {
            await connection.OpenAsync();
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT WikiPageId
                FROM WikiPageSearch
                WHERE WikiPageSearch MATCH $search
                ORDER BY bm25(WikiPageSearch)
                LIMIT 500;
                """;
            var parameter = command.CreateParameter();
            parameter.ParameterName = "$search";
            parameter.Value = ftsQuery;
            command.Parameters.Add(parameter);

            await using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                if (Guid.TryParse(reader.GetString(0), out var id))
                {
                    ids.Add(id);
                }
            }
        }
        catch (SqliteException)
        {
            return [];
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }

        return ids;
    }

    /// <summary>
    /// Imports wiki nodes recursively.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="nodes">The nodes to import.</param>
    /// <param name="parent">The optional parent page entity.</param>
    /// <param name="parentId">The optional parent page identifier.</param>
    /// <param name="createdAt">The creation timestamp.</param>
    /// <param name="reservedSlugsByParent">The slug cache for this import.</param>
    /// <param name="createdPages">All created pages.</param>
    /// <param name="rootPages">Created pages directly under the requested parent.</param>
    /// <param name="collectAsRoot">Whether imported nodes should be returned as root import pages.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    private static async Task ImportWikiNodesAsync(
        RepetitioDbContext dbContext,
        IEnumerable<ImportWikiPageNodeRequest> nodes,
        WikiPage? parent,
        Guid? parentId,
        DateTime createdAt,
        IDictionary<string, HashSet<string>> reservedSlugsByParent,
        ICollection<WikiPage> createdPages,
        ICollection<WikiPage> rootPages,
        bool collectAsRoot)
    {
        var sortOrder = await GetNextSortOrderAsync(dbContext, parentId);

        foreach (var node in nodes)
        {
            var slug = await CreateUniqueSlugAsync(
                dbContext,
                node.Slug,
                node.Title,
                parentId,
                null,
                reservedSlugsByParent);
            var page = new WikiPage
            {
                Id = Guid.NewGuid(),
                ParentId = parentId,
                Parent = parent,
                Title = node.Title.Trim(),
                Slug = slug,
                Path = BuildPath(parent, slug),
                Depth = parent is null ? 0 : parent.Depth + 1,
                SortOrder = sortOrder++,
                Summary = TrimOptional(node.Summary),
                ContentMarkdown = TrimContent(node.ContentMarkdown),
                CreatedAt = createdAt,
                UpdatedAt = createdAt
            };

            dbContext.WikiPages.Add(page);
            createdPages.Add(page);

            if (collectAsRoot)
            {
                rootPages.Add(page);
            }

            if (node.Children?.Count > 0)
            {
                await ImportWikiNodesAsync(
                    dbContext,
                    node.Children,
                    page,
                    page.Id,
                    createdAt,
                    reservedSlugsByParent,
                    createdPages,
                    rootPages,
                    false);
            }
        }
    }

    /// <summary>
    /// Converts free-form text into a safe SQLite FTS query.
    /// </summary>
    /// <param name="search">The raw search text.</param>
    /// <returns>A prefix-token FTS query.</returns>
    private static string BuildFtsQuery(string search)
    {
        var tokens = search
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(token => new string(token.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant())
            .Where(token => token.Length > 0)
            .Take(8)
            .ToArray();

        return string.Join(" OR ", tokens.Select(token => $"{token}*"));
    }

    /// <summary>
    /// Creates a unique slug for a sibling group.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="requestedSlug">The optional requested slug.</param>
    /// <param name="title">The title fallback.</param>
    /// <param name="parentId">The target parent page identifier.</param>
    /// <param name="currentPageId">The page being updated, when any.</param>
    /// <returns>A slug unique under the parent page.</returns>
    private static async Task<string> CreateUniqueSlugAsync(
        RepetitioDbContext dbContext,
        string? requestedSlug,
        string title,
        Guid? parentId,
        Guid? currentPageId)
    {
        return await CreateUniqueSlugAsync(dbContext, requestedSlug, title, parentId, currentPageId, null);
    }

    /// <summary>
    /// Creates a unique slug for a sibling group and considers unsaved imported pages.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="requestedSlug">The optional requested slug.</param>
    /// <param name="title">The title fallback.</param>
    /// <param name="parentId">The target parent page identifier.</param>
    /// <param name="currentPageId">The page being updated, when any.</param>
    /// <param name="reservedSlugsByParent">Slugs already reserved in the current batch.</param>
    /// <returns>A slug unique under the parent page.</returns>
    private static async Task<string> CreateUniqueSlugAsync(
        RepetitioDbContext dbContext,
        string? requestedSlug,
        string title,
        Guid? parentId,
        Guid? currentPageId,
        IDictionary<string, HashSet<string>>? reservedSlugsByParent)
    {
        var baseSlug = CreateSlug(EndpointValidation.HasText(requestedSlug) ? requestedSlug! : title);
        var slug = baseSlug;
        var suffix = 2;
        var reservedSlugs = reservedSlugsByParent is null
            ? null
            : await GetReservedSlugsAsync(dbContext, parentId, currentPageId, reservedSlugsByParent);

        while ((reservedSlugs is not null && reservedSlugs.Contains(slug))
            || await dbContext.WikiPages.AnyAsync(page =>
                page.ParentId == parentId
                && page.Slug == slug
                && (currentPageId == null || page.Id != currentPageId)))
        {
            slug = $"{baseSlug}-{suffix++}";
        }

        reservedSlugs?.Add(slug);

        return slug;
    }

    /// <summary>
    /// Gets already reserved slugs for an import sibling group.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="parentId">The parent page identifier.</param>
    /// <param name="currentPageId">The current page identifier when updating.</param>
    /// <param name="reservedSlugsByParent">The reservation cache.</param>
    /// <returns>Reserved slugs for the sibling group.</returns>
    private static async Task<HashSet<string>> GetReservedSlugsAsync(
        RepetitioDbContext dbContext,
        Guid? parentId,
        Guid? currentPageId,
        IDictionary<string, HashSet<string>> reservedSlugsByParent)
    {
        var parentKey = CreateParentSlugKey(parentId);

        if (reservedSlugsByParent.TryGetValue(parentKey, out var reservedSlugs))
        {
            return reservedSlugs;
        }

        var existingSlugs = await dbContext.WikiPages
            .Where(page => page.ParentId == parentId && (currentPageId == null || page.Id != currentPageId))
            .Select(page => page.Slug)
            .ToListAsync();
        reservedSlugs = existingSlugs.ToHashSet(StringComparer.OrdinalIgnoreCase);
        reservedSlugsByParent[parentKey] = reservedSlugs;

        return reservedSlugs;
    }

    /// <summary>
    /// Creates a dictionary key for a sibling group.
    /// </summary>
    /// <param name="parentId">The optional parent page identifier.</param>
    /// <returns>A stable sibling group key.</returns>
    private static string CreateParentSlugKey(Guid? parentId)
    {
        return parentId?.ToString("D") ?? "root";
    }

    /// <summary>
    /// Creates a URL-friendly slug.
    /// </summary>
    /// <param name="value">The source text.</param>
    /// <returns>A normalized slug.</returns>
    private static string CreateSlug(string value)
    {
        var builder = new StringBuilder();
        var previousWasDash = false;

        foreach (var character in value.Trim().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(character))
            {
                builder.Append(character);
                previousWasDash = false;
                continue;
            }

            if (!previousWasDash)
            {
                builder.Append('-');
                previousWasDash = true;
            }
        }

        var slug = builder.ToString().Trim('-');
        return slug.Length == 0 ? "page" : slug[..Math.Min(slug.Length, 180)];
    }

    /// <summary>
    /// Builds a materialized path from parent path and slug.
    /// </summary>
    /// <param name="parent">The optional parent page.</param>
    /// <param name="slug">The current page slug.</param>
    /// <returns>The slash-separated path.</returns>
    private static string BuildPath(WikiPage? parent, string slug)
    {
        return parent is null ? slug : $"{parent.Path}/{slug}";
    }

    /// <summary>
    /// Updates materialized paths and depths for descendants.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="oldPath">The previous page path.</param>
    /// <param name="newPath">The new page path.</param>
    /// <param name="oldDepth">The previous page depth.</param>
    /// <param name="newDepth">The new page depth.</param>
    /// <param name="updatedAt">The update timestamp.</param>
    private static async Task UpdateDescendantPathsAsync(
        RepetitioDbContext dbContext,
        string oldPath,
        string newPath,
        int oldDepth,
        int newDepth,
        DateTime updatedAt)
    {
        var descendants = await dbContext.WikiPages
            .Where(page => page.Path.StartsWith($"{oldPath}/"))
            .ToListAsync();
        var depthDelta = newDepth - oldDepth;

        foreach (var descendant in descendants)
        {
            descendant.Path = $"{newPath}{descendant.Path[oldPath.Length..]}";
            descendant.Depth += depthDelta;
            descendant.UpdatedAt = updatedAt;
        }
    }

    /// <summary>
    /// Gets direct child counts for a set of wiki page identifiers.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="pageIds">The parent identifiers.</param>
    /// <returns>Direct child counts by parent identifier.</returns>
    private static async Task<Dictionary<Guid, int>> GetChildCountsAsync(RepetitioDbContext dbContext, IReadOnlyCollection<Guid> pageIds)
    {
        if (pageIds.Count == 0)
        {
            return [];
        }

        return await dbContext.WikiPages
            .Where(page => page.ParentId != null && pageIds.Contains(page.ParentId.Value))
            .GroupBy(page => page.ParentId!.Value)
            .ToDictionaryAsync(group => group.Key, group => group.Count());
    }

    /// <summary>
    /// Gets the next display order value for a sibling group.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="parentId">The optional parent page identifier.</param>
    /// <returns>The next display order value.</returns>
    private static async Task<int> GetNextSortOrderAsync(RepetitioDbContext dbContext, Guid? parentId)
    {
        var maxSortOrder = await dbContext.WikiPages
            .Where(wikiPage => wikiPage.ParentId == parentId)
            .Select(wikiPage => (int?)wikiPage.SortOrder)
            .MaxAsync();

        return (maxSortOrder ?? -1) + 1;
    }

    /// <summary>
    /// Applies requested wiki ordering.
    /// </summary>
    /// <param name="query">The wiki page query.</param>
    /// <param name="sort">The requested sort mode.</param>
    /// <returns>The sorted query.</returns>
    private static IOrderedQueryable<WikiPage> ApplySort(IQueryable<WikiPage> query, string? sort)
    {
        if (string.Equals(sort, UpdatedOldestSort, StringComparison.OrdinalIgnoreCase))
        {
            return query.OrderBy(wikiPage => wikiPage.UpdatedAt).ThenBy(wikiPage => wikiPage.Title);
        }

        if (string.Equals(sort, TitleSort, StringComparison.OrdinalIgnoreCase))
        {
            return query.OrderBy(wikiPage => wikiPage.Title).ThenBy(wikiPage => wikiPage.Path);
        }

        if (string.Equals(sort, TreeSort, StringComparison.OrdinalIgnoreCase))
        {
            return query.OrderBy(wikiPage => wikiPage.Path).ThenBy(wikiPage => wikiPage.SortOrder);
        }

        return query.OrderByDescending(wikiPage => wikiPage.UpdatedAt).ThenBy(wikiPage => wikiPage.Title);
    }

    /// <summary>
    /// Normalizes one-based page numbers from query string input.
    /// </summary>
    /// <param name="page">The requested page number.</param>
    /// <returns>A page number greater than zero.</returns>
    private static int NormalizePage(int page)
    {
        return Math.Max(1, page);
    }

    /// <summary>
    /// Normalizes page size query string input.
    /// </summary>
    /// <param name="pageSize">The requested page size.</param>
    /// <returns>A bounded page size.</returns>
    private static int NormalizePageSize(int pageSize)
    {
        return Math.Clamp(pageSize, 1, 100);
    }

    /// <summary>
    /// Converts a wiki page into an API response.
    /// </summary>
    /// <param name="wikiPage">The wiki page.</param>
    /// <param name="childCount">The number of direct child pages.</param>
    /// <returns>The wiki page response.</returns>
    private static WikiPageResponse ToResponse(WikiPage wikiPage, int childCount)
    {
        return new WikiPageResponse
        {
            Id = wikiPage.Id,
            ParentId = wikiPage.ParentId,
            Title = wikiPage.Title,
            Slug = wikiPage.Slug,
            Path = wikiPage.Path,
            Depth = wikiPage.Depth,
            SortOrder = wikiPage.SortOrder,
            Summary = wikiPage.Summary,
            ContentMarkdown = wikiPage.ContentMarkdown,
            IsArchived = wikiPage.IsArchived,
            ChildCount = childCount,
            CreatedAt = wikiPage.CreatedAt,
            UpdatedAt = wikiPage.UpdatedAt
        };
    }

    /// <summary>
    /// Converts a wiki page into a tree node response.
    /// </summary>
    /// <param name="wikiPage">The wiki page.</param>
    /// <returns>The wiki tree node response.</returns>
    private static WikiTreeNodeResponse ToTreeNodeResponse(WikiPage wikiPage)
    {
        return new WikiTreeNodeResponse
        {
            Id = wikiPage.Id,
            ParentId = wikiPage.ParentId,
            Title = wikiPage.Title,
            Path = wikiPage.Path,
            Depth = wikiPage.Depth,
            SortOrder = wikiPage.SortOrder,
            UpdatedAt = wikiPage.UpdatedAt
        };
    }

    /// <summary>
    /// Trims optional text and converts empty strings to null.
    /// </summary>
    /// <param name="value">The text value.</param>
    /// <returns>The trimmed value when present; otherwise, <see langword="null"/>.</returns>
    private static string? TrimOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    /// <summary>
    /// Trims markdown content while preserving an empty document.
    /// </summary>
    /// <param name="value">The markdown content.</param>
    /// <returns>The trimmed content.</returns>
    private static string TrimContent(string? value)
    {
        return value?.Trim() ?? string.Empty;
    }

    /// <summary>
    /// Counts import nodes recursively.
    /// </summary>
    /// <param name="nodes">The import nodes.</param>
    /// <returns>Total node count.</returns>
    private static int CountImportNodes(IEnumerable<ImportWikiPageNodeRequest> nodes)
    {
        return nodes.Sum(node => 1 + CountImportNodes(node.Children ?? []));
    }

    /// <summary>
    /// Validates import nodes recursively.
    /// </summary>
    /// <param name="nodes">The import nodes.</param>
    /// <param name="path">The current validation path.</param>
    /// <returns>A validation message when invalid; otherwise, null.</returns>
    private static string? ValidateImportNodes(IEnumerable<ImportWikiPageNodeRequest?> nodes, string path = "pages")
    {
        var index = 0;

        foreach (var node in nodes)
        {
            index++;

            if (node is null)
            {
                return $"{path}[{index}] is required.";
            }

            if (!EndpointValidation.HasText(node.Title))
            {
                return $"{path}[{index}].title is required.";
            }

            var childError = ValidateImportNodes(node.Children ?? [], $"{path}[{index}].children");

            if (childError is not null)
            {
                return childError;
            }
        }

        return null;
    }
}
