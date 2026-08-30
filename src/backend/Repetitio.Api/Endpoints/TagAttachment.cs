using Microsoft.EntityFrameworkCore;
using Repetitio.Domain.LearningItems;
using Repetitio.Domain.Tags;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Api.Endpoints;

/// <summary>
/// Provides helpers for attaching normalized tags to learning items.
/// </summary>
internal static class TagAttachment
{
    /// <summary>
    /// Attaches normalized tag names to a learning item.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="item">The learning item.</param>
    /// <param name="tagNames">The raw tag names.</param>
    /// <param name="createdAt">The creation timestamp for new tags.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public static async Task AttachTagsAsync(
        RepetitioDbContext dbContext,
        LearningItem item,
        IEnumerable<string> tagNames,
        DateTime createdAt)
    {
        var normalizedNames = TagNameNormalizer.NormalizeMany(tagNames);

        if (normalizedNames.Count == 0)
        {
            return;
        }

        var existingTags = await dbContext.Tags
            .Where(tag => normalizedNames.Contains(tag.Name))
            .ToDictionaryAsync(tag => tag.Name, StringComparer.Ordinal);

        foreach (var tagName in normalizedNames)
        {
            if (!existingTags.TryGetValue(tagName, out var tag))
            {
                tag = new Tag
                {
                    Id = Guid.NewGuid(),
                    Name = tagName,
                    CreatedAt = createdAt
                };

                dbContext.Tags.Add(tag);
            }

            item.Tags.Add(new LearningItemTag
            {
                LearningItem = item,
                LearningItemId = item.Id,
                Tag = tag,
                TagId = tag.Id
            });
        }
    }
}
