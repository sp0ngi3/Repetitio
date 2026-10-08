using Microsoft.EntityFrameworkCore;
using Repetitio.Application.Wiki;
using Repetitio.Domain.Wiki;
using Repetitio.Infrastructure.Persistence;
using Repetitio.Infrastructure.Wiki;

namespace Repetitio.Api.Endpoints;

public static class WikiStudyEndpoints
{
    public static IEndpointRouteBuilder MapWikiStudyEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/wiki/study", (WikiStudyService service) => service.GetOverviewAsync());
        app.MapPost("/api/wiki/study", async (WikiStudyService service, SaveWikiStudyRequest request) =>
        {
            var error = await service.SaveAsync(request);
            return error is null ? Results.Ok(await service.GetOverviewAsync()) : Results.BadRequest(error);
        });
        app.MapPut("/api/wiki/study/settings", async (RepetitioDbContext db, WikiStudySettingsRequest request) =>
        {
            if (request.IntervalDays is < 1 or > 365) return Results.BadRequest("Choose 1 to 365 days.");
            var settings = await db.WikiStudySettings.FindAsync(1);
            if (settings is null) { settings = new WikiStudySettings(); db.WikiStudySettings.Add(settings); }
            settings.IntervalDays = request.IntervalDays;
            await db.SaveChangesAsync();
            return Results.Ok(settings);
        });
        app.MapPut("/api/wiki/{id:guid}/review-preference", async (RepetitioDbContext db, Guid id, WikiReviewPreferenceRequest request) =>
        {
            if (request.IntervalDays is < 1 or > 365) return Results.BadRequest("Choose 1 to 365 days.");
            var page = await db.WikiPages.FindAsync(id);
            if (page is null) return Results.NotFound();
            var pages = request.IncludeDescendants
                ? await db.WikiPages.Where(p => p.Id == id || p.Path.StartsWith(page.Path + "/")).ToListAsync()
                : [page];
            foreach (var item in pages) { item.ReviewEnabled = request.Enabled; item.ReviewIntervalDays = request.IntervalDays; }
            await db.SaveChangesAsync();
            return Results.Ok();
        });
        return app;
    }
}
