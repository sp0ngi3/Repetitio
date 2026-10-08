using System.IO.Compression;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;
using Repetitio.Application.Wiki;
using Repetitio.Domain.Wiki;
using Repetitio.Infrastructure.Backup;
using Repetitio.Infrastructure.Persistence;
using Repetitio.Infrastructure.Wiki;

namespace Repetitio.UnitTests.Wiki;

public sealed class WikiStudyTests
{
    [Fact]
    public async Task PartialSessionsCreditOnlyAnsweredPagesAndCompleteAcrossSessions()
    {
        await using var fixture = await DatabaseFixture.CreateAsync();
        var db = fixture.Db;
        var root = CreatePage("Root", "root", 2);
        var child = CreatePage("Child", "root/child", 1, root.Id);
        db.WikiPages.AddRange(root, child);
        await db.SaveChangesAsync();
        var service = new WikiStudyService(db);

        var sessionId = Guid.NewGuid();
        var firstQuestion = root.QuizQuestions.First();
        var first = new SaveWikiStudyRequest(sessionId, [Answer(root, firstQuestion, false), Answer(child, child.QuizQuestions.Single(), true)]);
        Assert.Null(await service.SaveAsync(first));
        Assert.Null(await service.SaveAsync(first));
        Assert.Equal(1, await db.WikiStudySessions.CountAsync());
        var overview = await service.GetOverviewAsync();
        var rootQuiz = overview.Pages.Single(p => p.Id == root.Id).Modes.Single(m => m.Kind == "quiz");
        Assert.Equal(1, rootQuiz.Covered);
        Assert.Null(rootQuiz.LastCompletedAt);
        Assert.Null(rootQuiz.NextReviewAt);
        var childQuiz = overview.Pages.Single(p => p.Id == child.Id).Modes.Single(m => m.Kind == "quiz");
        Assert.NotNull(childQuiz.LastCompletedAt);
        Assert.NotNull(childQuiz.NextReviewAt);

        Assert.Null(await service.SaveAsync(new(Guid.NewGuid(), [Answer(root, root.QuizQuestions.Last(), true)])));
        overview = await service.GetOverviewAsync();
        rootQuiz = overview.Pages.Single(p => p.Id == root.Id).Modes.Single(m => m.Kind == "quiz");
        Assert.Equal(2, rootQuiz.Covered);
        Assert.Equal(1, rootQuiz.Correct);
        Assert.NotNull(rootQuiz.LastCompletedAt);
        Assert.Equal(rootQuiz.LastCompletedAt!.Value.AddDays(30), rootQuiz.NextReviewAt);
        Assert.Null(overview.Pages.Single(p => p.Id == root.Id).Modes.Single(m => m.Kind == "flashcard").LastPracticedAt);

        // Start a new review cycle: the previous cycle cannot fill its missing answers.
        var previousCompletion = rootQuiz.LastCompletedAt;
        Assert.Null(await service.SaveAsync(new(Guid.NewGuid(), [Answer(root, firstQuestion, true)])));
        rootQuiz = (await service.GetOverviewAsync()).Pages.Single(p => p.Id == root.Id).Modes.Single(m => m.Kind == "quiz");
        Assert.Equal(1, rootQuiz.Covered);
        Assert.Equal(previousCompletion, rootQuiz.LastCompletedAt);
    }

    [Fact]
    public async Task ArchivedAndExcludedBranchesDoNotReceiveCreditAndSettingsRecalculateDueDates()
    {
        await using var fixture = await DatabaseFixture.CreateAsync();
        var db = fixture.Db;
        var root = CreatePage("Root", "root", 1);
        var child = CreatePage("Child", "root/child", 1, root.Id);
        var archived = CreatePage("Archived", "archived", 1);
        archived.IsArchived = true;
        db.WikiPages.AddRange(root, child, archived);
        await db.SaveChangesAsync();
        var service = new WikiStudyService(db);
        root.ReviewEnabled = false;
        child.ReviewEnabled = false;
        await db.SaveChangesAsync();
        Assert.Null(await service.SaveAsync(new(Guid.NewGuid(), [Answer(child, child.QuizQuestions.Single(), true), Answer(archived, archived.QuizQuestions.Single(), true)])));
        Assert.Empty(await db.WikiStudyAnswers.ToListAsync());
        root.ReviewEnabled = true;
        child.ReviewEnabled = true;
        await db.SaveChangesAsync();
        Assert.Null(await service.SaveAsync(new(Guid.NewGuid(), [Answer(child, child.QuizQuestions.Single(), true)])));
        db.WikiStudySettings.Add(new() { IntervalDays = 7 });
        await db.SaveChangesAsync();
        var mode = (await service.GetOverviewAsync()).Pages.Single(p => p.Id == child.Id).Modes.Single(m => m.Kind == "quiz");
        Assert.Equal(mode.LastCompletedAt!.Value.AddDays(7), mode.NextReviewAt);
        child.ReviewIntervalDays = 14;
        await db.SaveChangesAsync();
        mode = (await service.GetOverviewAsync()).Pages.Single(p => p.Id == child.Id).Modes.Single(m => m.Kind == "quiz");
        Assert.Equal(mode.LastCompletedAt!.Value.AddDays(14), mode.NextReviewAt);
    }

    [Fact]
    public async Task MigrationAndOldBackupRestorePreserveExistingWikiTextAndImages()
    {
        await using var fixture = await DatabaseFixture.CreateAsync(migrate: false);
        var db = fixture.Db;
        var migrations = db.Database.GetMigrations().ToArray();
        var oldSchema = migrations[^2];
        await db.GetService<IMigrator>().MigrateAsync(oldSchema);
        var id = Guid.NewGuid();
        var imageId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO WikiPages (Id,Title,Slug,Path,Depth,SortOrder,Summary,ContentMarkdown,IsArchived,CreatedAt,UpdatedAt) VALUES ({id},{"Original"},{"original"},{"original"},{0},{0},{"Existing summary"},{"## Original text\n\nNever lose this."},{false},{now},{now})");
        byte[] imageBytes = [1, 2, 3, 4];
        await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO WikiImages (Id,FileName,ContentType,Sha256,SizeBytes,Data,CreatedAt) VALUES ({imageId},{"original.png"},{"image/png"},{new string('a',64)},{4L},{imageBytes},{now})");
        var archive = await CreateArchiveAsync(fixture.Path, oldSchema);
        using (var services = new ServiceCollection()
            .AddDbContext<RepetitioDbContext>(options => options.UseSqlite($"Data Source={fixture.Path};Pooling=False"))
            .Configure<BackupOptions>(options => options.Directory = fixture.Backups)
            .AddSingleton<BackupArchiveValidator>()
            .AddScoped<IRepetitioBackupService, RepetitioBackupService>().BuildServiceProvider())
            await services.ApplyDatabaseMigrationsAsync();
        Assert.Single(Directory.GetFiles(fixture.Backups, "repetitio-pre-migration-*.zip"));
        var page = await db.WikiPages.SingleAsync();
        Assert.Equal("## Original text\n\nNever lose this.", page.ContentMarkdown);
        Assert.True(page.ReviewEnabled);
        Assert.Equal(imageBytes, (await db.WikiImages.SingleAsync()).Data);
        db.ChangeTracker.Clear();

        var service = new RepetitioBackupService(db, new BackupArchiveValidator(), Options.Create(new BackupOptions { Directory = fixture.Backups }));
        archive.Position = 0;
        var validation = await service.ValidateAsync(archive);
        Assert.True(validation.IsValid, validation.Message);
        archive.Position = 0;
        var import = await service.ImportAsync(archive);
        Assert.True(import.Imported, import.Message);
        Assert.NotNull(import.PreImportBackupFileName);
        Assert.True(File.Exists(System.IO.Path.Combine(fixture.Backups, import.PreImportBackupFileName)));
        Assert.Equal(imageBytes, (await db.WikiImages.AsNoTracking().SingleAsync()).Data);
        Assert.Equal("## Original text\n\nNever lose this.", (await db.WikiPages.AsNoTracking().SingleAsync()).ContentMarkdown);
        var exported = await service.ExportAsync();
        using var stream = new MemoryStream(exported.Contents);
        Assert.True((await service.ValidateAsync(stream)).IsValid);
    }

    [Fact]
    public async Task ExistingUserBackupCanBeUpgradedWithoutChangingItsContents()
    {
        // Opt-in verification runs against a temporary copy of an exported user backup.
        var archivePath = Environment.GetEnvironmentVariable("REPETITIO_COMPATIBILITY_BACKUP");
        if (string.IsNullOrWhiteSpace(archivePath)) return;
        await using var fixture = await DatabaseFixture.CreateAsync();
        var db = fixture.Db;
        var validator = new BackupArchiveValidator();
        await using var input = File.OpenRead(archivePath);
        using var extracted = await validator.ValidateArchiveAsync(input, db.Database.GetMigrations().Last());
        Assert.True(extracted.Validation.IsValid, extracted.Validation.Message);
        using var source = new SqliteConnection($"Data Source={extracted.DatabasePath};Mode=ReadOnly;Pooling=False");
        await source.OpenAsync();
        var before = await SnapshotAsync(source);
        await using (var copy = new RepetitioDbContext(new DbContextOptionsBuilder<RepetitioDbContext>().UseSqlite($"Data Source={extracted.DatabasePath};Pooling=False").Options))
            await copy.Database.MigrateAsync();
        var after = await SnapshotAsync(source);
        Assert.Equal(before, after);
        await using var originalArchive = File.OpenRead(archivePath);
        var service = new RepetitioBackupService(db, validator, Options.Create(new BackupOptions { Directory = fixture.Backups }));
        var result = await service.ImportAsync(originalArchive);
        Assert.True(result.Imported, result.Message);
        using var restored = new SqliteConnection($"Data Source={fixture.Path};Mode=ReadOnly;Pooling=False");
        await restored.OpenAsync();
        Assert.Equal(before, await SnapshotAsync(restored));
    }

    [Fact]
    public async Task BackupRoundTripIncludesWikiHistoryAndReviewPreferences()
    {
        await using var source = await DatabaseFixture.CreateAsync();
        var page = CreatePage("Tracked", "tracked", 1);
        page.ReviewIntervalDays = 14;
        source.Db.WikiPages.Add(page);
        source.Db.WikiStudySettings.Add(new() { IntervalDays = 7 });
        await source.Db.SaveChangesAsync();
        var study = new WikiStudyService(source.Db);
        Assert.Null(await study.SaveAsync(new(Guid.NewGuid(), [Answer(page, page.QuizQuestions.Single(), true)])));
        var backup = new RepetitioBackupService(source.Db, new BackupArchiveValidator(), Options.Create(new BackupOptions { Directory = source.Backups }));
        var export = await backup.ExportAsync();
        await using var target = await DatabaseFixture.CreateAsync();
        var restore = new RepetitioBackupService(target.Db, new BackupArchiveValidator(), Options.Create(new BackupOptions { Directory = target.Backups }));
        using var archive = new MemoryStream(export.Contents);
        Assert.True((await restore.ImportAsync(archive)).Imported);
        var overview = await new WikiStudyService(target.Db).GetOverviewAsync();
        Assert.Equal(7, overview.IntervalDays);
        Assert.Single(overview.History);
        var topic = Assert.Single(overview.Pages);
        Assert.Equal(14, topic.IntervalDays);
        var mode = topic.Modes.Single(m => m.Kind == "quiz");
        Assert.Equal(1, mode.Correct);
        Assert.Equal(mode.LastCompletedAt!.Value.AddDays(14), mode.NextReviewAt);
    }

    private static async Task<string[]> SnapshotAsync(SqliteConnection connection)
    {
        var lines = new List<string>();
        using var tables = connection.CreateCommand();
        tables.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'WikiStudy%' AND name NOT LIKE 'sqlite_%' AND name != '__EFMigrationsHistory' ORDER BY name";
        var names = new List<string>();
        await using (var reader = await tables.ExecuteReaderAsync()) while (await reader.ReadAsync()) names.Add(reader.GetString(0));
        foreach (var name in names)
        {
            using var command = connection.CreateCommand();
            // The new WikiPage columns are deliberately excluded from the pre-existing-data snapshot.
            command.CommandText = name == "WikiPages"
                ? "SELECT Id,ParentId,Title,Slug,Path,Depth,SortOrder,Summary,ContentMarkdown,IsArchived,CreatedAt,UpdatedAt FROM WikiPages"
                : "SELECT * FROM \"" + name.Replace("\"", "\"\"") + "\"";
            await using var rows = await command.ExecuteReaderAsync();
            while (await rows.ReadAsync()) lines.Add(name + ":" + JsonSerializer.Serialize(Enumerable.Range(0, rows.FieldCount)
                .Select(i => rows.IsDBNull(i) ? null : rows.GetValue(i) is byte[] bytes ? Convert.ToBase64String(bytes) : rows.GetValue(i).ToString()).ToArray()));
        }
        return lines.Order().ToArray();
    }

    private static WikiPage CreatePage(string title, string path, int questions, Guid? parent = null)
    {
        var page = new WikiPage { Id = Guid.NewGuid(), ParentId = parent, Title = title, Slug = path.Split('/').Last(), Path = path, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        for (var i = 0; i < questions; i++)
        {
            var question = new WikiQuizQuestion { Id = Guid.NewGuid(), Prompt = "Question " + i, SortOrder = i };
            question.Options.Add(new() { Id = Guid.NewGuid(), Text = "Correct", IsCorrect = true });
            question.Options.Add(new() { Id = Guid.NewGuid(), Text = "Incorrect", IsCorrect = false, SortOrder = 1 });
            page.QuizQuestions.Add(question);
        }
        return page;
    }

    private static WikiStudyAnswerRequest Answer(WikiPage page, WikiQuizQuestion question, bool correct) =>
        new(page.Id, question.Id, "quiz", question.Options.Single(option => option.IsCorrect == correct).Id, null);

    private static async Task<MemoryStream> CreateArchiveAsync(string database, string schema)
    {
        var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, true))
        {
            var manifest = new BackupManifest { Application = BackupManifest.ExpectedApplication,
                SchemaVersion = BackupManifest.CurrentSchemaVersion, DatabaseSchemaVersion = schema, CreatedAt = DateTimeOffset.UtcNow };
            await using (var output = zip.CreateEntry("manifest.json").Open()) await JsonSerializer.SerializeAsync(output, manifest);
            zip.CreateEntryFromFile(database, "repetitio.db");
        }
        stream.Position = 0;
        return stream;
    }

    private sealed class DatabaseFixture : IAsyncDisposable
    {
        public string DirectoryPath { get; } = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "repetitio-wiki-test-" + Guid.NewGuid().ToString("N"));
        public string Path => System.IO.Path.Combine(DirectoryPath, "test.db");
        public string Backups => System.IO.Path.Combine(DirectoryPath, "backups");
        public RepetitioDbContext Db { get; private set; } = null!;
        public static async Task<DatabaseFixture> CreateAsync(bool migrate = true)
        {
            var fixture = new DatabaseFixture();
            Directory.CreateDirectory(fixture.DirectoryPath);
            fixture.Db = new(new DbContextOptionsBuilder<RepetitioDbContext>().UseSqlite($"Data Source={fixture.Path};Pooling=False").Options);
            if (migrate) await fixture.Db.Database.MigrateAsync();
            return fixture;
        }
        public async ValueTask DisposeAsync() { await Db.DisposeAsync(); Directory.Delete(DirectoryPath, true); }
    }
}
