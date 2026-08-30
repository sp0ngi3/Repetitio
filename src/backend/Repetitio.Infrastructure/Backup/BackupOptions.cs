namespace Repetitio.Infrastructure.Backup;

/// <summary>
/// Provides configuration for backup export and import.
/// </summary>
public sealed class BackupOptions
{
    /// <summary>
    /// Gets or sets the directory where pre-import backups are stored.
    /// </summary>
    public string Directory { get; set; } = "backups";
}
