using Microsoft.EntityFrameworkCore;
using Repetitio.Application.Notes;
using Repetitio.Domain.Notes;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Api.Endpoints;

/// <summary>
/// Maps note page API endpoints.
/// </summary>
public static class NoteEndpoints
{
    private const int MaximumSortOrder = 100000;

    /// <summary>
    /// Adds note page endpoints to the application.
    /// </summary>
    /// <param name="app">The endpoint route builder.</param>
    /// <returns>The same endpoint route builder for chaining.</returns>
    public static IEndpointRouteBuilder MapNoteEndpoints(this IEndpointRouteBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);

        var group = app.MapGroup("/api/notes").WithTags("Notes");

        group.MapGet("/", GetNotePagesAsync).WithName("GetNotePages");
        group.MapGet("/{id:guid}", GetNotePageAsync).WithName("GetNotePage");
        group.MapPost("/", CreateNotePageAsync).WithName("CreateNotePage");
        group.MapPut("/{id:guid}", UpdateNotePageAsync).WithName("UpdateNotePage");
        group.MapDelete("/{id:guid}", DeleteNotePageAsync).WithName("DeleteNotePage");

        return app;
    }

    /// <summary>
    /// Returns note pages with optional notebook and search filters.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="area">The optional notebook area filter.</param>
    /// <param name="search">The optional text search.</param>
    /// <returns>The matching note pages.</returns>
    private static async Task<IResult> GetNotePagesAsync(
        RepetitioDbContext dbContext,
        NoteArea? area,
        string? search)
    {
        await EnsureDefaultNotePagesAsync(dbContext);

        var query = dbContext.NotePages.AsNoTracking();

        if (area is not null)
        {
            query = query.Where(notePage => notePage.Area == area);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(notePage =>
                notePage.Title.Contains(normalizedSearch)
                || notePage.ContentMarkdown.Contains(normalizedSearch));
        }

        var notes = await query
            .OrderBy(notePage => notePage.Area)
            .ThenBy(notePage => notePage.SortOrder)
            .ThenBy(notePage => notePage.Title)
            .ToListAsync();

        return Results.Ok(notes.Select(ToResponse));
    }

    /// <summary>
    /// Returns one note page.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The note page identifier.</param>
    /// <returns>The note page response when found.</returns>
    private static async Task<IResult> GetNotePageAsync(RepetitioDbContext dbContext, Guid id)
    {
        await EnsureDefaultNotePagesAsync(dbContext);

        var notePage = await dbContext.NotePages.AsNoTracking().FirstOrDefaultAsync(note => note.Id == id);

        return notePage is null ? Results.NotFound() : Results.Ok(ToResponse(notePage));
    }

    /// <summary>
    /// Creates a note page.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="request">The create request.</param>
    /// <returns>The created note page response.</returns>
    private static async Task<IResult> CreateNotePageAsync(RepetitioDbContext dbContext, CreateNotePageRequest request)
    {
        if (!EndpointValidation.HasText(request.Title))
        {
            return Results.BadRequest("Title is required.");
        }

        var now = DateTime.UtcNow;
        var sortOrder = await GetNextSortOrderAsync(dbContext, request.Area);
        var notePage = new NotePage
        {
            Id = Guid.NewGuid(),
            Area = request.Area,
            Title = request.Title.Trim(),
            ContentMarkdown = request.ContentMarkdown?.Trim() ?? string.Empty,
            SortOrder = sortOrder,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.NotePages.Add(notePage);
        await dbContext.SaveChangesAsync();

        return Results.Created($"/api/notes/{notePage.Id}", ToResponse(notePage));
    }

    /// <summary>
    /// Updates a note page.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The note page identifier.</param>
    /// <param name="request">The update request.</param>
    /// <returns>The updated note page response when found.</returns>
    private static async Task<IResult> UpdateNotePageAsync(
        RepetitioDbContext dbContext,
        Guid id,
        UpdateNotePageRequest request)
    {
        if (!EndpointValidation.HasText(request.Title))
        {
            return Results.BadRequest("Title is required.");
        }

        var notePage = await dbContext.NotePages.FirstOrDefaultAsync(note => note.Id == id);

        if (notePage is null)
        {
            return Results.NotFound();
        }

        notePage.Area = request.Area;
        notePage.Title = request.Title.Trim();
        notePage.ContentMarkdown = request.ContentMarkdown?.Trim() ?? string.Empty;
        notePage.SortOrder = Math.Clamp(request.SortOrder, 0, MaximumSortOrder);
        notePage.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();

        return Results.Ok(ToResponse(notePage));
    }

    /// <summary>
    /// Deletes a note page.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The note page identifier.</param>
    /// <returns>No content when the note page was deleted.</returns>
    private static async Task<IResult> DeleteNotePageAsync(RepetitioDbContext dbContext, Guid id)
    {
        var notePage = await dbContext.NotePages.FirstOrDefaultAsync(note => note.Id == id);

        if (notePage is null)
        {
            return Results.NotFound();
        }

        dbContext.NotePages.Remove(notePage);
        await dbContext.SaveChangesAsync();

        return Results.NoContent();
    }

    /// <summary>
    /// Ensures every notebook area has a default editable page.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    private static async Task EnsureDefaultNotePagesAsync(RepetitioDbContext dbContext)
    {
        var existingAreas = await dbContext.NotePages.Select(notePage => notePage.Area).Distinct().ToListAsync();
        var now = DateTime.UtcNow;

        foreach (var area in Enum.GetValues<NoteArea>().Where(area => !existingAreas.Contains(area)))
        {
            dbContext.NotePages.Add(new NotePage
            {
                Id = Guid.NewGuid(),
                Area = area,
                Title = GetDefaultTitle(area),
                ContentMarkdown = GetDefaultContent(area),
                SortOrder = 0,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        await dbContext.SaveChangesAsync();
    }

    /// <summary>
    /// Gets the next display order value for a notebook area.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="area">The notebook area.</param>
    /// <returns>The next display order value.</returns>
    private static async Task<int> GetNextSortOrderAsync(RepetitioDbContext dbContext, NoteArea area)
    {
        var maxSortOrder = await dbContext.NotePages
            .Where(notePage => notePage.Area == area)
            .Select(notePage => (int?)notePage.SortOrder)
            .MaxAsync();

        return (maxSortOrder ?? -1) + 1;
    }

    /// <summary>
    /// Converts a note page into an API response.
    /// </summary>
    /// <param name="notePage">The note page.</param>
    /// <returns>The note page response.</returns>
    private static NotePageResponse ToResponse(NotePage notePage)
    {
        return new NotePageResponse
        {
            Id = notePage.Id,
            Area = notePage.Area,
            Title = notePage.Title,
            ContentMarkdown = notePage.ContentMarkdown,
            SortOrder = notePage.SortOrder,
            CreatedAt = notePage.CreatedAt,
            UpdatedAt = notePage.UpdatedAt
        };
    }

    /// <summary>
    /// Gets the default note page title for a notebook area.
    /// </summary>
    /// <param name="area">The notebook area.</param>
    /// <returns>The default note page title.</returns>
    private static string GetDefaultTitle(NoteArea area)
    {
        return area switch
        {
            NoteArea.Dsa => "DSA Notes",
            NoteArea.SystemDesign => "System Design Notes",
            _ => "Other Notes"
        };
    }

    /// <summary>
    /// Gets the default note page content for a notebook area.
    /// </summary>
    /// <param name="area">The notebook area.</param>
    /// <returns>The default note page markdown.</returns>
    private static string GetDefaultContent(NoteArea area)
    {
        return area switch
        {
            NoteArea.Dsa => "## DSA Notes\n\nCapture patterns, pitfalls, templates, and reminders here.",
            NoteArea.SystemDesign => "## System Design Notes\n\nCapture architectures, tradeoffs, estimates, and interview framing here.",
            _ => "## Other Notes\n\nCapture anything that does not belong to DSA or System Design here."
        };
    }
}
