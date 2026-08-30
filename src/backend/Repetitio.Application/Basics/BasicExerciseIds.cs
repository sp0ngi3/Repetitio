using System.Security.Cryptography;
using System.Text;

namespace Repetitio.Application.Basics;

/// <summary>
/// Creates stable identifiers for hardcoded Basics exercises.
/// </summary>
public static class BasicExerciseIds
{
    /// <summary>
    /// Creates the stable learning item identifier for a Basics exercise slug.
    /// </summary>
    /// <param name="slug">The built-in exercise slug.</param>
    /// <returns>The deterministic learning item identifier.</returns>
    public static Guid CreateLearningItemId(string slug)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(slug);

        var bytes = MD5.HashData(Encoding.UTF8.GetBytes($"repetitio:basics:{slug.Trim().ToLowerInvariant()}"));
        return new Guid(bytes);
    }
}
