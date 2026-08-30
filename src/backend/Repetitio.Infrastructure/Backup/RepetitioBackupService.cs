using System.IO.Compression;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Infrastructure.Backup;

/// <summary>
/// Provides SQLite backup export, validation, and import operations.
/// </summary>
public sealed class RepetitioBackupService : IRepetitioBackupService
{
    private static readonly JsonSerializerOptions ManifestJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    private readonly RepetitioDbContext dbContext;
    private readonly BackupArchiveValidator validator;
    private readonly BackupOptions options;

    /// <summary>
    /// Initializes a new instance of the <see cref="RepetitioBackupService"/> class.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="validator">The backup archive validator.</param>
    /// <param name="options">The backup options.</param>
    public RepetitioBackupService(
        RepetitioDbContext dbContext,
        BackupArchiveValidator validator,
        IOptions<BackupOptions> options)
    {
        this.dbContext = dbContext;
        this.validator = validator;
        this.options = options.Value;
    }

    /// <inheritdoc />
    public async Task<BackupStatus> GetStatusAsync(CancellationToken cancellationToken = default)
    {
        var databasePath = GetDatabasePath();

        return new BackupStatus
        {
            DatabasePath = databasePath,
            DatabaseExists = File.Exists(databasePath),
            BackupDirectory = GetBackupDirectoryPath(),
            DatabaseSchemaVersion = await GetCurrentDatabaseSchemaVersionAsync(cancellationToken)
        };
    }

    /// <inheritdoc />
    public async Task<BackupExport> ExportAsync(CancellationToken cancellationToken = default)
    {
        var schemaVersion = await GetCurrentDatabaseSchemaVersionAsync(cancellationToken);
        var createdAt = DateTimeOffset.UtcNow;
        var manifest = CreateManifest(createdAt, schemaVersion);
        var tempDatabasePath = Path.Combine(Path.GetTempPath(), $"repetitio-export-{Guid.NewGuid():N}.db");

        try
        {
            BackupDatabaseToFile(tempDatabasePath);

            var databaseValidation = await validator.ValidateDatabaseAsync(
                tempDatabasePath,
                schemaVersion,
                manifest,
                cancellationToken);

            if (!databaseValidation.IsValid)
            {
                throw new InvalidOperationException(databaseValidation.Message);
            }

            var contents = await CreateArchiveAsync(tempDatabasePath, manifest, cancellationToken);

            return new BackupExport
            {
                FileName = CreateBackupFileName("repetitio-backup", createdAt),
                Contents = contents,
                Manifest = manifest
            };
        }
        finally
        {
            DeleteIfExists(tempDatabasePath);
        }
    }

    /// <inheritdoc />
    public async Task<BackupValidationResult> ValidateAsync(
        Stream backupStream,
        CancellationToken cancellationToken = default)
    {
        using var validatedBackup = await validator.ValidateArchiveAsync(
            backupStream,
            await GetCurrentDatabaseSchemaVersionAsync(cancellationToken),
            cancellationToken);

        return validatedBackup.Validation;
    }

    /// <inheritdoc />
    public async Task<BackupImport> ImportAsync(Stream backupStream, CancellationToken cancellationToken = default)
    {
        using var validatedBackup = await validator.ValidateArchiveAsync(
            backupStream,
            await GetCurrentDatabaseSchemaVersionAsync(cancellationToken),
            cancellationToken);

        if (!validatedBackup.Validation.IsValid)
        {
            return new BackupImport
            {
                Imported = false,
                Message = validatedBackup.Validation.Message,
                Validation = validatedBackup.Validation
            };
        }

        var preImportBackup = await ExportAsync(cancellationToken);
        var backupDirectory = GetBackupDirectoryPath();
        Directory.CreateDirectory(backupDirectory);

        var preImportPath = Path.Combine(
            backupDirectory,
            CreateBackupFileName("repetitio-pre-import", DateTimeOffset.UtcNow));

        await File.WriteAllBytesAsync(preImportPath, preImportBackup.Contents, cancellationToken);

        RestoreDatabaseFromFile(validatedBackup.DatabasePath);

        return new BackupImport
        {
            Imported = true,
            Message = "Backup imported successfully.",
            PreImportBackupFileName = Path.GetFileName(preImportPath),
            Validation = validatedBackup.Validation
        };
    }

    /// <summary>
    /// Creates a backup manifest.
    /// </summary>
    /// <param name="createdAt">The backup creation timestamp.</param>
    /// <param name="databaseSchemaVersion">The current database schema version.</param>
    /// <returns>The backup manifest.</returns>
    private static BackupManifest CreateManifest(DateTimeOffset createdAt, string databaseSchemaVersion)
    {
        return new BackupManifest
        {
            Application = BackupManifest.ExpectedApplication,
            SchemaVersion = BackupManifest.CurrentSchemaVersion,
            CreatedAt = createdAt,
            DatabaseSchemaVersion = databaseSchemaVersion
        };
    }

    /// <summary>
    /// Creates a timestamped backup file name.
    /// </summary>
    /// <param name="prefix">The file name prefix.</param>
    /// <param name="createdAt">The backup creation timestamp.</param>
    /// <returns>The backup file name.</returns>
    private static string CreateBackupFileName(string prefix, DateTimeOffset createdAt)
    {
        return $"{prefix}-{createdAt.UtcDateTime:yyyy-MM-dd-HHmmss}.zip";
    }

    /// <summary>
    /// Deletes a file if it exists.
    /// </summary>
    /// <param name="path">The file path.</param>
    private static void DeleteIfExists(string path)
    {
        if (File.Exists(path))
        {
            SqliteConnection.ClearAllPools();
            File.Delete(path);
        }
    }

    /// <summary>
    /// Creates the zip archive content.
    /// </summary>
    /// <param name="databasePath">The SQLite backup database path.</param>
    /// <param name="manifest">The backup manifest.</param>
    /// <param name="cancellationToken">A token used to cancel the operation.</param>
    /// <returns>The zip archive bytes.</returns>
    private static async Task<byte[]> CreateArchiveAsync(
        string databasePath,
        BackupManifest manifest,
        CancellationToken cancellationToken)
    {
        using var memoryStream = new MemoryStream();
        using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            var manifestEntry = archive.CreateEntry("manifest.json", CompressionLevel.Optimal);
            await using (var manifestStream = manifestEntry.Open())
            {
                await JsonSerializer.SerializeAsync(
                    manifestStream,
                    manifest,
                    ManifestJsonOptions,
                    cancellationToken);
            }

            archive.CreateEntryFromFile(databasePath, "repetitio.db", CompressionLevel.Optimal);
        }

        return memoryStream.ToArray();
    }

    /// <summary>
    /// Backs up the live SQLite database into a separate database file.
    /// </summary>
    /// <param name="destinationPath">The destination SQLite database path.</param>
    private void BackupDatabaseToFile(string destinationPath)
    {
        DeleteIfExists(destinationPath);

        using var sourceConnection = new SqliteConnection(GetConnectionString());
        using var destinationConnection = new SqliteConnection(CreateUnpooledConnectionString(destinationPath));
        sourceConnection.Open();
        destinationConnection.Open();
        sourceConnection.BackupDatabase(destinationConnection);
    }

    /// <summary>
    /// Restores a validated SQLite database into the live database.
    /// </summary>
    /// <param name="sourcePath">The validated SQLite database path.</param>
    private void RestoreDatabaseFromFile(string sourcePath)
    {
        using var sourceConnection = new SqliteConnection(CreateUnpooledConnectionString(sourcePath, SqliteOpenMode.ReadOnly));
        using var destinationConnection = new SqliteConnection(GetConnectionString());
        sourceConnection.Open();
        destinationConnection.Open();
        sourceConnection.BackupDatabase(destinationConnection);
    }

    /// <summary>
    /// Creates an unpooled SQLite connection string for temporary backup database files.
    /// </summary>
    /// <param name="databasePath">The SQLite database path.</param>
    /// <param name="mode">The SQLite open mode.</param>
    /// <returns>An unpooled SQLite connection string.</returns>
    private static string CreateUnpooledConnectionString(string databasePath, SqliteOpenMode mode = SqliteOpenMode.ReadWriteCreate)
    {
        return new SqliteConnectionStringBuilder
        {
            DataSource = databasePath,
            Mode = mode,
            Pooling = false
        }.ToString();
    }

    /// <summary>
    /// Gets the configured SQLite connection string.
    /// </summary>
    /// <returns>The configured SQLite connection string.</returns>
    private string GetConnectionString()
    {
        return dbContext.Database.GetConnectionString()
            ?? throw new InvalidOperationException("Repetitio database connection string is not configured.");
    }

    /// <summary>
    /// Gets the resolved SQLite database file path.
    /// </summary>
    /// <returns>The resolved SQLite database path.</returns>
    private string GetDatabasePath()
    {
        var builder = new SqliteConnectionStringBuilder(GetConnectionString());

        return Path.GetFullPath(builder.DataSource);
    }

    /// <summary>
    /// Gets the resolved backup directory path.
    /// </summary>
    /// <returns>The resolved backup directory path.</returns>
    private string GetBackupDirectoryPath()
    {
        return Path.GetFullPath(options.Directory);
    }

    /// <summary>
    /// Gets the latest applied Entity Framework migration.
    /// </summary>
    /// <param name="cancellationToken">A token used to cancel the operation.</param>
    /// <returns>The current database schema version.</returns>
    private async Task<string> GetCurrentDatabaseSchemaVersionAsync(CancellationToken cancellationToken)
    {
        var migrations = await dbContext.Database.GetAppliedMigrationsAsync(cancellationToken);

        return migrations.LastOrDefault() ?? string.Empty;
    }
}
