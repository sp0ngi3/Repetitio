using Repetitio.Domain.LearningItems;

namespace Repetitio.Domain.Tags;

/// <summary>
/// Represents a reusable label that can be attached to learning items.
/// </summary>
public sealed class Tag
{
    /// <summary>
    /// Gets or sets the unique tag identifier.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the normalized tag name.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the date and time when the tag was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets the learning items that use this tag.
    /// </summary>
    public ICollection<LearningItemTag> LearningItems { get; } = new List<LearningItemTag>();
}
