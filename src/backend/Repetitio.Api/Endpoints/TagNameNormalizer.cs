using System.Globalization;

namespace Repetitio.Api.Endpoints;

/// <summary>
/// Normalizes user-provided tag names before persistence.
/// </summary>
internal static class TagNameNormalizer
{
    /// <summary>
    /// Normalizes a tag name by trimming whitespace, removing a leading hash sign, and lowercasing.
    /// </summary>
    /// <param name="name">The raw tag name.</param>
    /// <returns>The normalized tag name.</returns>
    public static string Normalize(string name)
    {
        return name.Trim().TrimStart('#').Trim().ToLower(CultureInfo.InvariantCulture);
    }

    /// <summary>
    /// Normalizes and de-duplicates a list of tag names.
    /// </summary>
    /// <param name="names">The raw tag names.</param>
    /// <returns>The normalized tag names.</returns>
    public static IReadOnlyCollection<string> NormalizeMany(IEnumerable<string> names)
    {
        ArgumentNullException.ThrowIfNull(names);

        return names
            .Select(Normalize)
            .Where(EndpointValidation.HasText)
            .Distinct(StringComparer.Ordinal)
            .Order(StringComparer.Ordinal)
            .ToArray();
    }
}
