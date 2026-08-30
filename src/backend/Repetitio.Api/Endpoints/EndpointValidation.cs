namespace Repetitio.Api.Endpoints;

/// <summary>
/// Provides small validation helpers for endpoint handlers.
/// </summary>
internal static class EndpointValidation
{
    /// <summary>
    /// Returns whether a confidence value is inside the supported MVP range.
    /// </summary>
    /// <param name="confidence">The optional confidence value.</param>
    /// <returns><see langword="true"/> when the confidence is valid; otherwise, <see langword="false"/>.</returns>
    public static bool IsValidConfidence(int? confidence)
    {
        return confidence is null or >= 1 and <= 5;
    }

    /// <summary>
    /// Returns whether a text value contains non-whitespace content.
    /// </summary>
    /// <param name="value">The text value.</param>
    /// <returns><see langword="true"/> when the text is present; otherwise, <see langword="false"/>.</returns>
    public static bool HasText(string? value)
    {
        return !string.IsNullOrWhiteSpace(value);
    }
}
