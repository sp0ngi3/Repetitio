using System.IO.Compression;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Repetitio.Infrastructure.Backup;

namespace Repetitio.UnitTests.Backup;

/// <summary>
/// Tests backup archive validation behavior.
/// </summary>
public sealed class BackupArchiveValidatorTests
{
    private const string SchemaVersion = "20260831070355_AlignFlashcardModel";

    /// <summary>
    /// Verifies that a well-formed Repetitio backup archive is accepted.
    /// </summary>
    /// <returns>A task representing the asynchronous test.</returns>
    [Fact]
    public async Task ValidateArchiveAsync_AcceptsValidBackup()
    {
        var archive = await CreateBackupArchiveAsync(CreateManifest(SchemaVersion), SchemaVersion);
        var validator = new BackupArchiveValidator();

        using var validatedBackup = await validator.ValidateArchiveAsync(archive, SchemaVersion);

        Assert.True(validatedBackup.Validation.IsValid);
        Assert.Equal("Backup is valid.", validatedBackup.Validation.Message);
    }

    /// <summary>
    /// Verifies that a schema mismatch blocks validation.
    /// </summary>
    /// <returns>A task representing the asynchronous test.</returns>
    [Fact]
    public async Task ValidateArchiveAsync_RejectsSchemaMismatch()
    {
        var archive = await CreateBackupArchiveAsync(CreateManifest("old-schema"), "old-schema");
        var validator = new BackupArchiveValidator();

        using var validatedBackup = await validator.ValidateArchiveAsync(archive, SchemaVersion);

        Assert.False(validatedBackup.Validation.IsValid);
        Assert.Equal(
            "Backup manifest database schema version does not match the current application.",
            validatedBackup.Validation.Message);
    }

    /// <summary>
    /// Verifies that a malformed archive is rejected.
    /// </summary>
    /// <returns>A task representing the asynchronous test.</returns>
    [Fact]
    public async Task ValidateArchiveAsync_RejectsMalformedArchive()
    {
        await using var archive = new MemoryStream("not a zip"u8.ToArray());
        var validator = new BackupArchiveValidator();

        using var validatedBackup = await validator.ValidateArchiveAsync(archive, SchemaVersion);

        Assert.False(validatedBackup.Validation.IsValid);
        Assert.Equal("Backup file is not a valid zip archive.", validatedBackup.Validation.Message);
    }

    /// <summary>
    /// Creates a test backup archive.
    /// </summary>
    /// <param name="manifest">The archive manifest.</param>
    /// <param name="schemaVersion">The database schema version to write.</param>
    /// <returns>The backup archive stream.</returns>
    private static async Task<MemoryStream> CreateBackupArchiveAsync(BackupManifest manifest, string schemaVersion)
    {
        var databasePath = Path.Combine(Path.GetTempPath(), $"repetitio-test-{Guid.NewGuid():N}.db");

        try
        {
            await CreateDatabaseAsync(databasePath, schemaVersion);

            var stream = new MemoryStream();

            using (var archive = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: true))
            {
                var manifestEntry = archive.CreateEntry("manifest.json");
                await using (var manifestStream = manifestEntry.Open())
                {
                    await JsonSerializer.SerializeAsync(
                        manifestStream,
                        manifest,
                        new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                }

                archive.CreateEntryFromFile(databasePath, "repetitio.db");
            }

            stream.Position = 0;

            return stream;
        }
        finally
        {
            if (File.Exists(databasePath))
            {
                File.Delete(databasePath);
            }
        }
    }

    /// <summary>
    /// Creates a minimal SQLite database with the required Repetitio tables.
    /// </summary>
    /// <param name="databasePath">The SQLite database path.</param>
    /// <param name="schemaVersion">The schema version to write into migration history.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    private static async Task CreateDatabaseAsync(string databasePath, string schemaVersion)
    {
        await using var connection = new SqliteConnection(new SqliteConnectionStringBuilder
        {
            DataSource = databasePath,
            Pooling = false
        }.ToString());
        await connection.OpenAsync();

        var commands = new[]
        {
            "CREATE TABLE __EFMigrationsHistory (MigrationId TEXT NOT NULL PRIMARY KEY, ProductVersion TEXT NOT NULL);",
            "CREATE TABLE LearningItems (Id TEXT NOT NULL PRIMARY KEY);",
            "CREATE TABLE PracticeSessions (Id TEXT NOT NULL PRIMARY KEY);",
            "CREATE TABLE Tags (Id TEXT NOT NULL PRIMARY KEY);",
            "CREATE TABLE LearningItemTags (LearningItemId TEXT NOT NULL, TagId TEXT NOT NULL);",
            "CREATE TABLE DsaProblems (LearningItemId TEXT NOT NULL PRIMARY KEY);",
            "CREATE TABLE DsaSolutions (Id TEXT NOT NULL PRIMARY KEY);",
            "CREATE TABLE SystemDesignProblems (LearningItemId TEXT NOT NULL PRIMARY KEY);",
            "CREATE TABLE Flashcards (LearningItemId TEXT NOT NULL PRIMARY KEY);",
            "CREATE TABLE FlashcardDecks (Id TEXT NOT NULL PRIMARY KEY);",
            "CREATE TABLE FlashcardDeckCards (DeckId TEXT NOT NULL, FlashcardLearningItemId TEXT NOT NULL);",
            "CREATE TABLE FlashcardReviews (Id TEXT NOT NULL PRIMARY KEY);",
            $"INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion) VALUES ('{schemaVersion}', '10.0.11');"
        };

        foreach (var commandText in commands)
        {
            await using var command = connection.CreateCommand();
            command.CommandText = commandText;
            await command.ExecuteNonQueryAsync();
        }
    }

    /// <summary>
    /// Creates a backup manifest for tests.
    /// </summary>
    /// <param name="schemaVersion">The database schema version.</param>
    /// <returns>The backup manifest.</returns>
    private static BackupManifest CreateManifest(string schemaVersion)
    {
        return new BackupManifest
        {
            Application = BackupManifest.ExpectedApplication,
            SchemaVersion = BackupManifest.CurrentSchemaVersion,
            CreatedAt = DateTimeOffset.UtcNow,
            DatabaseSchemaVersion = schemaVersion
        };
    }
}
