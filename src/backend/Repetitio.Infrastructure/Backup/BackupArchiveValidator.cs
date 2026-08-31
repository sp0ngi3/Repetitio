using System.IO.Compression;
using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace Repetitio.Infrastructure.Backup;

/// <summary>
/// Validates Repetitio backup archives before import.
/// </summary>
public sealed class BackupArchiveValidator
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private static readonly string[] RequiredTables =
    [
        "__EFMigrationsHistory",
        "LearningItems",
        "PracticeSessions",
        "Tags",
        "LearningItemTags",
        "DsaProblems",
        "DsaSolutions",
        "SystemDesignProblems",
        "Flashcards",
        "FlashcardDecks",
        "FlashcardDeckCards",
        "FlashcardReviews",
        "NotePages"
    ];

    /// <summary>
    /// Validates a backup archive and extracts its SQLite database to a temporary file.
    /// </summary>
    /// <param name="backupStream">The uploaded backup archive stream.</param>
    /// <param name="expectedDatabaseSchemaVersion">The expected database schema version.</param>
    /// <param name="cancellationToken">A token used to cancel the validation.</param>
    /// <returns>The extracted backup file and validation result.</returns>
    public async Task<ValidatedBackupFile> ValidateArchiveAsync(
        Stream backupStream,
        string expectedDatabaseSchemaVersion,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(backupStream);

        var tempDatabasePath = Path.Combine(Path.GetTempPath(), $"repetitio-import-{Guid.NewGuid():N}.db");

        try
        {
            using var archive = new ZipArchive(backupStream, ZipArchiveMode.Read, leaveOpen: true);
            var manifestResult = await ReadManifestAsync(archive, cancellationToken);

            if (!manifestResult.IsValid || manifestResult.Manifest is null)
            {
                return new ValidatedBackupFile(tempDatabasePath, manifestResult);
            }

            var schemaResult = ValidateManifest(manifestResult.Manifest, expectedDatabaseSchemaVersion);

            if (!schemaResult.IsValid)
            {
                return new ValidatedBackupFile(tempDatabasePath, schemaResult);
            }

            var databaseEntry = archive.GetEntry("repetitio.db");

            if (databaseEntry is null)
            {
                return new ValidatedBackupFile(
                    tempDatabasePath,
                    BackupValidationResult.Invalid("Backup archive does not contain repetitio.db.", manifestResult.Manifest));
            }

            await using (var entryStream = databaseEntry.Open())
            await using (var databaseStream = File.Create(tempDatabasePath))
            {
                await entryStream.CopyToAsync(databaseStream, cancellationToken);
            }

            var databaseValidation = await ValidateDatabaseAsync(
                tempDatabasePath,
                expectedDatabaseSchemaVersion,
                manifestResult.Manifest,
                cancellationToken);

            return new ValidatedBackupFile(tempDatabasePath, databaseValidation);
        }
        catch (InvalidDataException)
        {
            return new ValidatedBackupFile(
                tempDatabasePath,
                BackupValidationResult.Invalid("Backup file is not a valid zip archive."));
        }
        catch (JsonException)
        {
            return new ValidatedBackupFile(
                tempDatabasePath,
                BackupValidationResult.Invalid("Backup manifest is not valid JSON."));
        }
        catch (SqliteException)
        {
            return new ValidatedBackupFile(
                tempDatabasePath,
                BackupValidationResult.Invalid("Backup database is not a valid SQLite database."));
        }
    }

    /// <summary>
    /// Validates a SQLite database file against the expected schema.
    /// </summary>
    /// <param name="databasePath">The SQLite database path.</param>
    /// <param name="expectedDatabaseSchemaVersion">The expected database schema version.</param>
    /// <param name="manifest">The backup manifest being validated.</param>
    /// <param name="cancellationToken">A token used to cancel validation.</param>
    /// <returns>The validation result.</returns>
    public async Task<BackupValidationResult> ValidateDatabaseAsync(
        string databasePath,
        string expectedDatabaseSchemaVersion,
        BackupManifest manifest,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(databasePath);
        ArgumentNullException.ThrowIfNull(manifest);

        if (!File.Exists(databasePath))
        {
            return BackupValidationResult.Invalid("Backup database file is missing.", manifest);
        }

        var connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = databasePath,
            Mode = SqliteOpenMode.ReadOnly,
            Pooling = false
        }.ToString();

        await using var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        var integrity = await ExecuteScalarStringAsync(connection, "PRAGMA integrity_check;", cancellationToken);

        if (!string.Equals(integrity, "ok", StringComparison.OrdinalIgnoreCase))
        {
            return BackupValidationResult.Invalid("Backup database failed SQLite integrity check.", manifest);
        }

        foreach (var tableName in RequiredTables)
        {
            if (!await TableExistsAsync(connection, tableName, cancellationToken))
            {
                return BackupValidationResult.Invalid($"Backup database is missing required table '{tableName}'.", manifest);
            }
        }

        var databaseSchemaVersion = await ReadDatabaseSchemaVersionAsync(connection, cancellationToken);

        if (!string.Equals(databaseSchemaVersion, expectedDatabaseSchemaVersion, StringComparison.Ordinal))
        {
            return BackupValidationResult.Invalid("Backup database schema version does not match the current application.", manifest);
        }

        return BackupValidationResult.Valid("Backup is valid.", manifest);
    }

    /// <summary>
    /// Reads and validates the archive manifest entry.
    /// </summary>
    /// <param name="archive">The backup archive.</param>
    /// <param name="cancellationToken">A token used to cancel validation.</param>
    /// <returns>The manifest validation result.</returns>
    private static async Task<BackupValidationResult> ReadManifestAsync(
        ZipArchive archive,
        CancellationToken cancellationToken)
    {
        var manifestEntry = archive.GetEntry("manifest.json");

        if (manifestEntry is null)
        {
            return BackupValidationResult.Invalid("Backup archive does not contain manifest.json.");
        }

        await using var manifestStream = manifestEntry.Open();
        var manifest = await JsonSerializer.DeserializeAsync<BackupManifest>(
            manifestStream,
            JsonOptions,
            cancellationToken);

        if (manifest is null)
        {
            return BackupValidationResult.Invalid("Backup manifest could not be read.");
        }

        return BackupValidationResult.Valid("Backup manifest was read.", manifest);
    }

    /// <summary>
    /// Validates manifest metadata before reading the database.
    /// </summary>
    /// <param name="manifest">The parsed backup manifest.</param>
    /// <param name="expectedDatabaseSchemaVersion">The expected database schema version.</param>
    /// <returns>The validation result.</returns>
    private static BackupValidationResult ValidateManifest(BackupManifest manifest, string expectedDatabaseSchemaVersion)
    {
        if (!string.Equals(manifest.Application, BackupManifest.ExpectedApplication, StringComparison.Ordinal))
        {
            return BackupValidationResult.Invalid("Backup was not created by Repetitio.", manifest);
        }

        if (manifest.SchemaVersion != BackupManifest.CurrentSchemaVersion)
        {
            return BackupValidationResult.Invalid("Backup manifest schema version is not supported.", manifest);
        }

        if (!string.Equals(manifest.DatabaseSchemaVersion, expectedDatabaseSchemaVersion, StringComparison.Ordinal))
        {
            return BackupValidationResult.Invalid("Backup manifest database schema version does not match the current application.", manifest);
        }

        return BackupValidationResult.Valid("Backup manifest is valid.", manifest);
    }

    /// <summary>
    /// Returns whether a table exists in the SQLite database.
    /// </summary>
    /// <param name="connection">The open SQLite connection.</param>
    /// <param name="tableName">The required table name.</param>
    /// <param name="cancellationToken">A token used to cancel validation.</param>
    /// <returns><see langword="true"/> when the table exists; otherwise, <see langword="false"/>.</returns>
    private static async Task<bool> TableExistsAsync(
        SqliteConnection connection,
        string tableName,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = $name;";
        command.Parameters.AddWithValue("$name", tableName);
        var count = (long)(await command.ExecuteScalarAsync(cancellationToken) ?? 0L);

        return count > 0;
    }

    /// <summary>
    /// Reads the latest applied Entity Framework migration from the database.
    /// </summary>
    /// <param name="connection">The open SQLite connection.</param>
    /// <param name="cancellationToken">A token used to cancel validation.</param>
    /// <returns>The latest migration identifier.</returns>
    private static async Task<string> ReadDatabaseSchemaVersionAsync(
        SqliteConnection connection,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT MigrationId FROM __EFMigrationsHistory ORDER BY MigrationId DESC LIMIT 1;";

        return await ExecuteScalarStringAsync(command, cancellationToken) ?? string.Empty;
    }

    /// <summary>
    /// Executes a scalar string command.
    /// </summary>
    /// <param name="connection">The open SQLite connection.</param>
    /// <param name="commandText">The SQL command text.</param>
    /// <param name="cancellationToken">A token used to cancel the command.</param>
    /// <returns>The scalar string value.</returns>
    private static async Task<string?> ExecuteScalarStringAsync(
        SqliteConnection connection,
        string commandText,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = commandText;

        return await ExecuteScalarStringAsync(command, cancellationToken);
    }

    /// <summary>
    /// Executes a scalar string command.
    /// </summary>
    /// <param name="command">The SQLite command.</param>
    /// <param name="cancellationToken">A token used to cancel the command.</param>
    /// <returns>The scalar string value.</returns>
    private static async Task<string?> ExecuteScalarStringAsync(
        SqliteCommand command,
        CancellationToken cancellationToken)
    {
        var value = await command.ExecuteScalarAsync(cancellationToken);

        return value?.ToString();
    }
}

/// <summary>
/// Represents an extracted backup database and its validation result.
/// </summary>
public sealed class ValidatedBackupFile : IDisposable
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ValidatedBackupFile"/> class.
    /// </summary>
    /// <param name="databasePath">The extracted temporary database path.</param>
    /// <param name="validation">The validation result.</param>
    public ValidatedBackupFile(string databasePath, BackupValidationResult validation)
    {
        DatabasePath = databasePath;
        Validation = validation;
    }

    /// <summary>
    /// Gets the extracted temporary SQLite database path.
    /// </summary>
    public string DatabasePath { get; }

    /// <summary>
    /// Gets the validation result.
    /// </summary>
    public BackupValidationResult Validation { get; }

    /// <inheritdoc />
    public void Dispose()
    {
        if (File.Exists(DatabasePath))
        {
            SqliteConnection.ClearAllPools();
            File.Delete(DatabasePath);
        }
    }
}
