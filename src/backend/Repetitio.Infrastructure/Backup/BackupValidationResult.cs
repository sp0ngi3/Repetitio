namespace Repetitio.Infrastructure.Backup;

/// <summary>
/// Represents the result of backup archive validation.
/// </summary>
public sealed record BackupValidationResult
{
    /// <summary>
    /// Gets whether the archive is valid.
    /// </summary>
    public required bool IsValid { get; init; }

    /// <summary>
    /// Gets the validation message.
    /// </summary>
    public required string Message { get; init; }

    /// <summary>
    /// Gets the parsed manifest when available.
    /// </summary>
    public BackupManifest? Manifest { get; init; }

    /// <summary>
    /// Creates a successful validation result.
    /// </summary>
    /// <param name="message">The validation message.</param>
    /// <param name="manifest">The parsed backup manifest.</param>
    /// <returns>A successful validation result.</returns>
    public static BackupValidationResult Valid(string message, BackupManifest manifest)
    {
        return new BackupValidationResult
        {
            IsValid = true,
            Message = message,
            Manifest = manifest
        };
    }

    /// <summary>
    /// Creates a failed validation result.
    /// </summary>
    /// <param name="message">The validation message.</param>
    /// <param name="manifest">The parsed backup manifest when available.</param>
    /// <returns>A failed validation result.</returns>
    public static BackupValidationResult Invalid(string message, BackupManifest? manifest = null)
    {
        return new BackupValidationResult
        {
            IsValid = false,
            Message = message,
            Manifest = manifest
        };
    }
}
