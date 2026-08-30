using Microsoft.EntityFrameworkCore;
using Repetitio.Application.Tags;
using Repetitio.Domain.Tags;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Api.Endpoints;

/// <summary>
/// Maps tag API endpoints.
/// </summary>
public static class TagEndpoints
{
    /// <summary>
    /// Adds tag endpoints to the application.
    /// </summary>
    /// <param name="app">The endpoint route builder.</param>
    /// <returns>The same endpoint route builder for chaining.</returns>
    public static IEndpointRouteBuilder MapTagEndpoints(this IEndpointRouteBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);

        var group = app.MapGroup("/api/tags").WithTags("Tags");

        group.MapGet("/", GetTagsAsync).WithName("GetTags");
        group.MapPost("/", CreateTagAsync).WithName("CreateTag");

        return app;
    }

    /// <summary>
    /// Returns all tags.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <returns>The tag responses.</returns>
    private static async Task<IResult> GetTagsAsync(RepetitioDbContext dbContext)
    {
        var tags = await dbContext.Tags
            .AsNoTracking()
            .OrderBy(tag => tag.Name)
            .ToListAsync();

        return Results.Ok(tags.Select(ApiMappings.ToResponse));
    }

    /// <summary>
    /// Creates a tag when it does not exist yet.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="request">The create request.</param>
    /// <returns>The created or existing tag response.</returns>
    private static async Task<IResult> CreateTagAsync(RepetitioDbContext dbContext, CreateTagRequest request)
    {
        var normalizedName = TagNameNormalizer.Normalize(request.Name);

        if (!EndpointValidation.HasText(normalizedName))
        {
            return Results.BadRequest("Tag name is required.");
        }

        var existingTag = await dbContext.Tags.FirstOrDefaultAsync(tag => tag.Name == normalizedName);

        if (existingTag is not null)
        {
            return Results.Ok(ApiMappings.ToResponse(existingTag));
        }

        var tag = new Tag
        {
            Id = Guid.NewGuid(),
            Name = normalizedName,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Tags.Add(tag);
        await dbContext.SaveChangesAsync();

        return Results.Created($"/api/tags/{tag.Id}", ApiMappings.ToResponse(tag));
    }
}
