namespace Repetitio.Infrastructure.Backup;

/// <summary>
/// Provides backup export, import, and validation operations.
/// </summary>
public interface IRepetitioBackupService
{
    /// <summary>
    /// Gets the current backup system status.
    /// </summary>
    /// <param name="cancellationToken">A token used to cancel the operation.</param>
    /// <returns>The backup system status.</returns>
    Task<BackupStatus> GetStatusAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Exports the current SQLite database into a zip archive.
    /// </summary>
    /// <param name="cancellationToken">A token used to cancel the operation.</param>
    /// <returns>The backup archive bytes and file name.</returns>
    Task<BackupExport> ExportAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a retained automatic shutdown backup on disk.
    /// </summary>
    /// <param name="cancellationToken">A token used to cancel the operation.</param>
    /// <returns>The automatic backup result.</returns>
    Task<AutomaticBackupResult> CreateAutomaticShutdownBackupAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates a backup archive without importing it.
    /// </summary>
    /// <param name="backupStream">The backup archive stream.</param>
    /// <param name="cancellationToken">A token used to cancel the operation.</param>
    /// <returns>The validation result.</returns>
    Task<BackupValidationResult> ValidateAsync(Stream backupStream, CancellationToken cancellationToken = default);

    /// <summary>
    /// Imports a validated backup archive and creates a pre-import backup first.
    /// </summary>
    /// <param name="backupStream">The backup archive stream.</param>
    /// <param name="cancellationToken">A token used to cancel the operation.</param>
    /// <returns>The import result.</returns>
    Task<BackupImport> ImportAsync(Stream backupStream, CancellationToken cancellationToken = default);
}

/// <summary>
/// Represents backup system status.
/// </summary>
public sealed record BackupStatus
{
    /// <summary>
    /// Gets the configured SQLite database path.
    /// </summary>
    public required string DatabasePath { get; init; }

    /// <summary>
    /// Gets whether the configured SQLite database exists.
    /// </summary>
    public required bool DatabaseExists { get; init; }

    /// <summary>
    /// Gets the configured backup directory path.
    /// </summary>
    public required string BackupDirectory { get; init; }

    /// <summary>
    /// Gets the current database schema version.
    /// </summary>
    public required string DatabaseSchemaVersion { get; init; }
}

/// <summary>
/// Represents an exported backup archive.
/// </summary>
public sealed record BackupExport
{
    /// <summary>
    /// Gets the backup file name.
    /// </summary>
    public required string FileName { get; init; }

    /// <summary>
    /// Gets the backup archive content.
    /// </summary>
    public required byte[] Contents { get; init; }

    /// <summary>
    /// Gets the backup manifest.
    /// </summary>
    public required BackupManifest Manifest { get; init; }
}

/// <summary>
/// Represents an automatic backup written to the local backup directory.
/// </summary>
public sealed record AutomaticBackupResult
{
    /// <summary>
    /// Gets the automatic backup file name.
    /// </summary>
    public required string FileName { get; init; }

    /// <summary>
    /// Gets the full automatic backup file path.
    /// </summary>
    public required string FilePath { get; init; }

    /// <summary>
    /// Gets the number of retained automatic backups after cleanup.
    /// </summary>
    public required int RetainedAutomaticBackupCount { get; init; }
}

/// <summary>
/// Represents a backup import result.
/// </summary>
public sealed record BackupImport
{
    /// <summary>
    /// Gets whether the backup was imported.
    /// </summary>
    public required bool Imported { get; init; }

    /// <summary>
    /// Gets the import result message.
    /// </summary>
    public required string Message { get; init; }

    /// <summary>
    /// Gets the pre-import backup file name.
    /// </summary>
    public string? PreImportBackupFileName { get; init; }

    /// <summary>
    /// Gets the validation result created before import.
    /// </summary>
    public required BackupValidationResult Validation { get; init; }
}
