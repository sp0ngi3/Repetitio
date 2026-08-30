namespace Repetitio.Application.Backup;

/// <summary>
/// Represents the metadata stored inside every Repetitio backup archive.
/// </summary>
public sealed record BackupManifestResponse
{
    /// <summary>
    /// Gets the application name that produced the backup.
    /// </summary>
    public required string Application { get; init; }

    /// <summary>
    /// Gets the backup manifest schema version.
    /// </summary>
    public required int SchemaVersion { get; init; }

    /// <summary>
    /// Gets the UTC date and time when the backup was created.
    /// </summary>
    public required DateTimeOffset CreatedAt { get; init; }

    /// <summary>
    /// Gets the Entity Framework migration version captured in the backup.
    /// </summary>
    public required string DatabaseSchemaVersion { get; init; }
}

/// <summary>
/// Represents the current backup system status.
/// </summary>
public sealed record BackupStatusResponse
{
    /// <summary>
    /// Gets the configured SQLite database path.
    /// </summary>
    public required string DatabasePath { get; init; }

    /// <summary>
    /// Gets whether the SQLite database file currently exists.
    /// </summary>
    public required bool DatabaseExists { get; init; }

    /// <summary>
    /// Gets the configured backup directory path.
    /// </summary>
    public required string BackupDirectory { get; init; }

    /// <summary>
    /// Gets the latest applied Entity Framework migration.
    /// </summary>
    public required string DatabaseSchemaVersion { get; init; }
}

/// <summary>
/// Represents a backup validation response.
/// </summary>
public sealed record BackupValidationResponse
{
    /// <summary>
    /// Gets whether the uploaded backup is valid for the current application.
    /// </summary>
    public required bool IsValid { get; init; }

    /// <summary>
    /// Gets the validation message.
    /// </summary>
    public required string Message { get; init; }

    /// <summary>
    /// Gets the parsed backup manifest when it could be read.
    /// </summary>
    public BackupManifestResponse? Manifest { get; init; }
}

/// <summary>
/// Represents an import backup response.
/// </summary>
public sealed record ImportBackupResponse
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
    /// Gets the pre-import backup file name created before restore.
    /// </summary>
    public string? PreImportBackupFileName { get; init; }

    /// <summary>
    /// Gets the validation result produced before import.
    /// </summary>
    public required BackupValidationResponse Validation { get; init; }
}
