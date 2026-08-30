using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.LearningItems;

/// <summary>
/// Contains product rules for user-managed learning items.
/// </summary>
public static class LearningItemRules
{
    /// <summary>
    /// Returns whether a learning item type can be created by the user.
    /// </summary>
    /// <param name="type">The learning item type.</param>
    /// <returns><see langword="true"/> when the type is user-managed; otherwise, <see langword="false"/>.</returns>
    public static bool CanBeCreatedByUser(LearningItemType type)
    {
        return type is LearningItemType.Dsa or LearningItemType.SystemDesign;
    }
}
