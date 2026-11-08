using System.Security.Cryptography;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Repetitio.Api.Desktop;
using Repetitio.Infrastructure.Backup;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.UnitTests.Backup;

public sealed class BackupSafetyTests
{
    [Fact]
    public async Task DiskBackedArchiveRoundTripsWithoutChangingFormatOrImageBytes()
    {
        await using var fixture = await Fixture.CreateAsync();
        var bytes = RandomNumberGenerator.GetBytes(2 * 1024 * 1024);
        await fixture.Db.Database.ExecuteSqlRawAsync("CREATE TABLE BackupSentinel (Data BLOB)");
        await fixture.Db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO BackupSentinel VALUES ({bytes})");
        string temporary;
        await using (var export = await fixture.Service.ExportFileAsync())
        {
            temporary = export.Contents.Name;
            Assert.True(File.Exists(temporary));
            using var validated = await new BackupArchiveValidator().ValidateArchiveAsync(export.Contents, fixture.Db.Database.GetMigrations().Last());
            Assert.True(validated.Validation.IsValid);
            export.Contents.Position = 0;
            await fixture.Db.Database.ExecuteSqlRawAsync("UPDATE BackupSentinel SET Data = X'00'");
            var imported = await fixture.Service.ImportAsync(export.Contents);
            Assert.True(imported.Imported, imported.Message);
            Assert.True(File.Exists(Path.Combine(fixture.Backups, imported.PreImportBackupFileName!)));
            Assert.Equal(bytes, await ReadSentinel(fixture.Db));
        }
        Assert.False(File.Exists(temporary));
    }

    [Fact]
    public async Task FailedSafetyBackupPreventsLiveDatabaseReplacement()
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.Db.Database.ExecuteSqlRawAsync("CREATE TABLE BackupSentinel (Data BLOB); INSERT INTO BackupSentinel VALUES (X'01')");
        await using var backup = await fixture.Service.ExportFileAsync();
        await fixture.Db.Database.ExecuteSqlRawAsync("UPDATE BackupSentinel SET Data = X'02'");
        await File.WriteAllTextAsync(fixture.Backups, "a file blocks the backup directory");
        await Assert.ThrowsAnyAsync<IOException>(() => fixture.Service.ImportAsync(backup.Contents));
        Assert.Equal(new byte[] { 2 }, await ReadSentinel(fixture.Db));
        Assert.Equal("a file blocks the backup directory", await File.ReadAllTextAsync(fixture.Backups));
    }

    [Fact]
    public async Task InvalidZipDoesNotReplaceCurrentData()
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.Db.Database.ExecuteSqlRawAsync("CREATE TABLE BackupSentinel (Data BLOB); INSERT INTO BackupSentinel VALUES (X'0304')");
        using var invalid = new MemoryStream("not a backup"u8.ToArray());
        Assert.False((await fixture.Service.ImportAsync(invalid)).Imported);
        Assert.Equal(new byte[] { 3, 4 }, await ReadSentinel(fixture.Db));
    }

    [Fact]
    public async Task OfflineRecoveryRetainsCorruptOriginalAndWalAndDoesNotModifyZip()
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.Db.Database.ExecuteSqlRawAsync("CREATE TABLE BackupSentinel (Data BLOB); INSERT INTO BackupSentinel VALUES (X'070809')");
        var zip = Path.Combine(fixture.Root, "old-compatible-backup.zip");
        await using (var backup = await fixture.Service.ExportFileAsync())
            await RepetitioBackupService.PersistArchiveAsync(backup.Contents, zip);
        var originalZip = SHA256.HashData(await File.ReadAllBytesAsync(zip));
        var target = Path.Combine(fixture.Root, "data", "repetitio.db");
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
        await File.WriteAllTextAsync(target, "retain this unreadable database");
        await File.WriteAllTextAsync(target + "-wal", "retain this WAL");
        await File.WriteAllTextAsync(target + "-shm", "retain this SHM");
        await DesktopRecovery.RestoreAsync(zip, target);
        await DesktopRuntime.ValidateDatabaseAsync(target);
        var preserved = Assert.Single(Directory.GetDirectories(fixture.Backups, "recovery-original-*"));
        Assert.Equal("retain this unreadable database", await File.ReadAllTextAsync(Path.Combine(preserved, "repetitio.db")));
        Assert.Equal("retain this WAL", await File.ReadAllTextAsync(Path.Combine(preserved, "repetitio.db-wal")));
        Assert.Equal("retain this SHM", await File.ReadAllTextAsync(Path.Combine(preserved, "repetitio.db-shm")));
        Assert.Equal(originalZip, SHA256.HashData(await File.ReadAllBytesAsync(zip)));
        Assert.False(File.Exists(target + ".restore-pending.json"));
    }

    [Fact]
    public async Task InvalidOfflineRecoveryLeavesExistingDataAndInterruptedRecoveryMarkerUntouched()
    {
        await using var fixture = await Fixture.CreateAsync();
        var target = Path.Combine(fixture.Root, "data", "repetitio.db");
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
        await File.WriteAllTextAsync(target, "valuable original");
        await File.WriteAllTextAsync(target + ".restore-pending.json", "previous recovery marker");
        var zip = Path.Combine(fixture.Root, "invalid.zip");
        await File.WriteAllTextAsync(zip, "invalid backup");
        await Assert.ThrowsAsync<InvalidOperationException>(() => DesktopRecovery.RestoreAsync(zip, target));
        Assert.Equal("valuable original", await File.ReadAllTextAsync(target));
        Assert.Equal("previous recovery marker", await File.ReadAllTextAsync(target + ".restore-pending.json"));
    }

    [Fact]
    public async Task PublishingBackupNeverOverwritesAnExistingArchive()
    {
        await using var fixture = await Fixture.CreateAsync();
        var path = Path.Combine(fixture.Root, "keep.zip");
        await File.WriteAllTextAsync(path, "existing backup");
        using var stream = new MemoryStream("new bytes"u8.ToArray());
        await Assert.ThrowsAsync<IOException>(() => RepetitioBackupService.PersistArchiveAsync(stream, path));
        Assert.Equal("existing backup", await File.ReadAllTextAsync(path));
        Assert.Empty(Directory.GetFiles(fixture.Root, "*.pending-*"));
    }

    [Fact]
    public async Task DailyBackupsRetainThreeSuccessfulDaysAndPreserveOtherArchives()
    {
        await using var fixture = await Fixture.CreateAsync();
        var daily = Directory.CreateDirectory(Path.Combine(fixture.Backups, "daily")).FullName;
        var previousDays = new[] { "2026-10-29.zip", "2026-11-01.zip", "2026-11-03.zip" };
        foreach (var file in previousDays)
            await File.WriteAllTextAsync(Path.Combine(daily, file), "previous daily backup");

        var manual = Path.Combine(daily, "manual.zip");
        var safety = Path.Combine(fixture.Backups, "repetitio-pre-import.zip");
        await File.WriteAllTextAsync(manual, "manual backup");
        await File.WriteAllTextAsync(safety, "pre-import backup");

        var today = new DateOnly(2026, 11, 8);
        Assert.True(await fixture.Service.EnsureDailyBackupAsync(today));
        Assert.False(File.Exists(Path.Combine(daily, previousDays[0])));
        Assert.All(previousDays.Skip(1), file => Assert.True(File.Exists(Path.Combine(daily, file))));
        Assert.True(File.Exists(manual));
        Assert.True(File.Exists(safety));

        var published = Path.Combine(daily, "2026-11-08.zip");
        var original = await File.ReadAllBytesAsync(published);
        Assert.False(await fixture.Service.EnsureDailyBackupAsync(today));
        Assert.Equal(original, await File.ReadAllBytesAsync(published));
        await using var archive = File.OpenRead(published);
        var validation = await fixture.Service.ValidateAsync(archive);
        Assert.True(validation.IsValid, validation.Message);
    }

    [Fact]
    public async Task FailedDailyPublicationDoesNotPrunePreviousBackups()
    {
        await using var fixture = await Fixture.CreateAsync();
        var daily = Directory.CreateDirectory(Path.Combine(fixture.Backups, "daily")).FullName;
        var previousDays = new[] { "2026-11-05.zip", "2026-11-06.zip", "2026-11-07.zip" };
        foreach (var file in previousDays)
            await File.WriteAllTextAsync(Path.Combine(daily, file), "previous daily backup");
        Directory.CreateDirectory(Path.Combine(daily, "2026-11-08.zip"));

        var error = await Record.ExceptionAsync(() => fixture.Service.EnsureDailyBackupAsync(new DateOnly(2026, 11, 8)));

        Assert.True(error is IOException or UnauthorizedAccessException, error?.ToString());
        Assert.All(previousDays, file => Assert.True(File.Exists(Path.Combine(daily, file))));
        Assert.Empty(Directory.GetFiles(daily, "*.pending-*"));
    }

    private static async Task<byte[]> ReadSentinel(RepetitioDbContext db)
    {
        await using var connection = new SqliteConnection(db.Database.GetConnectionString());
        await connection.OpenAsync();
        await using var query = connection.CreateCommand();
        query.CommandText = "SELECT Data FROM BackupSentinel";
        return (byte[])(await query.ExecuteScalarAsync())!;
    }

    private sealed class Fixture : IAsyncDisposable
    {
        public string Root { get; } = Path.Combine(Path.GetTempPath(), "repetitio-backup-safety-" + Guid.NewGuid().ToString("N"));
        public string Backups => Path.Combine(Root, "backups");
        public RepetitioDbContext Db { get; private set; } = null!;
        public RepetitioBackupService Service => new(Db, new BackupArchiveValidator(), Options.Create(new BackupOptions { Directory = Backups }));
        public static async Task<Fixture> CreateAsync()
        {
            var fixture = new Fixture();
            Directory.CreateDirectory(fixture.Root);
            fixture.Db = new RepetitioDbContext(new DbContextOptionsBuilder<RepetitioDbContext>()
                .UseSqlite($"Data Source={Path.Combine(fixture.Root, "source.db")};Pooling=False").Options);
            await fixture.Db.Database.MigrateAsync();
            return fixture;
        }
        public async ValueTask DisposeAsync() { await Db.DisposeAsync(); Directory.Delete(Root, recursive: true); }
    }
}
