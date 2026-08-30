using Repetitio.Domain.LearningItems;

namespace Repetitio.Domain.Tags;

/// <summary>
/// Represents the many-to-many relationship between a learning item and a tag.
/// </summary>
public sealed class LearningItemTag
{
    /// <summary>
    /// Gets or sets the learning item identifier.
    /// </summary>
    public Guid LearningItemId { get; set; }

    /// <summary>
    /// Gets or sets the related learning item.
    /// </summary>
    public LearningItem LearningItem { get; set; } = null!;

    /// <summary>
    /// Gets or sets the tag identifier.
    /// </summary>
    public Guid TagId { get; set; }

    /// <summary>
    /// Gets or sets the related tag.
    /// </summary>
    public Tag Tag { get; set; } = null!;
}
