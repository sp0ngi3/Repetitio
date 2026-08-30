using Microsoft.EntityFrameworkCore;
using Repetitio.Application.LearningItems;
using Repetitio.Domain.LearningItems;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Api.Endpoints;

/// <summary>
/// Maps learning item API endpoints.
/// </summary>
public static class LearningItemEndpoints
{
    /// <summary>
    /// Adds learning item endpoints to the application.
    /// </summary>
    /// <param name="app">The endpoint route builder.</param>
    /// <returns>The same endpoint route builder for chaining.</returns>
    public static IEndpointRouteBuilder MapLearningItemEndpoints(this IEndpointRouteBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);

        var group = app.MapGroup("/api/items").WithTags("Learning Items");

        group.MapGet("/", GetLearningItemsAsync).WithName("GetLearningItems");
        group.MapGet("/{id:guid}", GetLearningItemAsync).WithName("GetLearningItem");
        group.MapPost("/", CreateLearningItemAsync).WithName("CreateLearningItem");
        group.MapPut("/{id:guid}", UpdateLearningItemAsync).WithName("UpdateLearningItem");
        group.MapDelete("/{id:guid}", DeleteLearningItemAsync).WithName("DeleteLearningItem");

        return app;
    }

    /// <summary>
    /// Returns all learning items, optionally filtered by type.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="type">The optional learning item type filter.</param>
    /// <returns>The learning item responses.</returns>
    private static async Task<IResult> GetLearningItemsAsync(RepetitioDbContext dbContext, LearningItemType? type)
    {
        var query = dbContext.LearningItems
            .AsNoTracking()
            .Include(item => item.Tags)
            .ThenInclude(itemTag => itemTag.Tag)
            .Include(item => item.PracticeSessions)
            .AsQueryable();

        if (type is not null)
        {
            query = query.Where(item => item.Type == type);
        }

        var items = await query
            .OrderBy(item => item.NextReviewAt == null)
            .ThenBy(item => item.NextReviewAt)
            .ThenBy(item => item.Title)
            .ToListAsync();

        return Results.Ok(items.Select(ApiMappings.ToResponse));
    }

    /// <summary>
    /// Returns a learning item by identifier.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The learning item identifier.</param>
    /// <returns>The learning item response when found.</returns>
    private static async Task<IResult> GetLearningItemAsync(RepetitioDbContext dbContext, Guid id)
    {
        var item = await dbContext.LearningItems
            .AsNoTracking()
            .Include(learningItem => learningItem.Tags)
            .ThenInclude(itemTag => itemTag.Tag)
            .Include(learningItem => learningItem.PracticeSessions)
            .FirstOrDefaultAsync(learningItem => learningItem.Id == id);

        return item is null ? Results.NotFound() : Results.Ok(ApiMappings.ToResponse(item));
    }

    /// <summary>
    /// Creates a learning item.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="request">The create request.</param>
    /// <returns>The created learning item response.</returns>
    private static async Task<IResult> CreateLearningItemAsync(RepetitioDbContext dbContext, CreateLearningItemRequest request)
    {
        if (!EndpointValidation.HasText(request.Title))
        {
            return Results.BadRequest("Title is required.");
        }

        if (!LearningItemRules.CanBeCreatedByUser(request.Type))
        {
            return Results.BadRequest("Basics exercises are built in and cannot be created by users.");
        }

        var now = DateTime.UtcNow;
        var item = new LearningItem
        {
            Id = Guid.NewGuid(),
            Type = request.Type,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Difficulty = request.Difficulty,
            Status = LearningItemStatus.NotStarted,
            CreatedAt = now,
            UpdatedAt = now
        };

        await TagAttachment.AttachTagsAsync(dbContext, item, request.Tags, now);

        dbContext.LearningItems.Add(item);
        await dbContext.SaveChangesAsync();

        return Results.Created($"/api/items/{item.Id}", ApiMappings.ToResponse(item));
    }

    /// <summary>
    /// Updates a learning item.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The learning item identifier.</param>
    /// <param name="request">The update request.</param>
    /// <returns>The updated learning item response when found.</returns>
    private static async Task<IResult> UpdateLearningItemAsync(RepetitioDbContext dbContext, Guid id, UpdateLearningItemRequest request)
    {
        if (!EndpointValidation.HasText(request.Title))
        {
            return Results.BadRequest("Title is required.");
        }

        if (!EndpointValidation.IsValidConfidence(request.Confidence))
        {
            return Results.BadRequest("Confidence must be between 1 and 5.");
        }

        if (!LearningItemRules.CanBeCreatedByUser(request.Type))
        {
            return Results.BadRequest("Basics exercises are built in and cannot be managed through learning item endpoints.");
        }

        var item = await dbContext.LearningItems
            .Include(learningItem => learningItem.Tags)
            .ThenInclude(itemTag => itemTag.Tag)
            .Include(learningItem => learningItem.PracticeSessions)
            .FirstOrDefaultAsync(learningItem => learningItem.Id == id);

        if (item is null)
        {
            return Results.NotFound();
        }

        var now = DateTime.UtcNow;
        item.Type = request.Type;
        item.Title = request.Title.Trim();
        item.Description = request.Description?.Trim();
        item.Status = request.Status;
        item.Difficulty = request.Difficulty;
        item.Confidence = request.Confidence;
        item.UpdatedAt = now;
        item.Tags.Clear();

        await TagAttachment.AttachTagsAsync(dbContext, item, request.Tags, now);
        await dbContext.SaveChangesAsync();

        return Results.Ok(ApiMappings.ToResponse(item));
    }

    /// <summary>
    /// Deletes a learning item.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The learning item identifier.</param>
    /// <returns>No content when the item was deleted.</returns>
    private static async Task<IResult> DeleteLearningItemAsync(RepetitioDbContext dbContext, Guid id)
    {
        var item = await dbContext.LearningItems.FirstOrDefaultAsync(learningItem => learningItem.Id == id);

        if (item is null)
        {
            return Results.NotFound();
        }

        if (item.Type == LearningItemType.Basics)
        {
            return Results.BadRequest("Basics exercises are built in and cannot be deleted through learning item endpoints.");
        }

        dbContext.LearningItems.Remove(item);
        await dbContext.SaveChangesAsync();

        return Results.NoContent();
    }

}
