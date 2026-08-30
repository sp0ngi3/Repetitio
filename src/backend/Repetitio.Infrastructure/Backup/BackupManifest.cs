namespace Repetitio.Infrastructure.Backup;

/// <summary>
/// Represents metadata stored in the backup archive manifest.
/// </summary>
public sealed record BackupManifest
{
    /// <summary>
    /// Gets the expected application name inside backup manifests.
    /// </summary>
    public const string ExpectedApplication = "Repetitio";

    /// <summary>
    /// Gets the current backup manifest schema version.
    /// </summary>
    public const int CurrentSchemaVersion = 1;

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
