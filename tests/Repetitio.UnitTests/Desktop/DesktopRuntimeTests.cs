using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Repetitio.Api.Desktop;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.UnitTests.Desktop;

public sealed class DesktopRuntimeTests
{
    [Fact]
    public void TokenAuthorizationRejectsAbsentShortAndIncorrectCredentials()
    {
        var token = new string('a', 64);
        Assert.True(DesktopRuntime.IsAuthorized(token, token));
        Assert.False(DesktopRuntime.IsAuthorized(token, ""));
        Assert.False(DesktopRuntime.IsAuthorized(token, new string('b', 64)));
        Assert.False(DesktopRuntime.IsAuthorized("short", "short"));
    }

    [Fact]
    public async Task CopyIncludesCommittedWalDataAndDoesNotModifyOriginal()
    {
        var folder = Path.Combine(Path.GetTempPath(), "repetitio-desktop-tests-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(folder);
        var source = Path.Combine(folder, "original.db");
        var destination = Path.Combine(folder, "windows.db");
        try
        {
            await using (var context = new RepetitioDbContext(new DbContextOptionsBuilder<RepetitioDbContext>().UseSqlite($"Data Source={source};Pooling=False").Options))
                await context.Database.MigrateAsync();
            await using (var connection = new SqliteConnection($"Data Source={source};Pooling=False"))
            {
                await connection.OpenAsync();
                await using var command = connection.CreateCommand();
                command.CommandText = "PRAGMA journal_mode=WAL; CREATE TABLE DesktopCopySentinel (Value BLOB); INSERT INTO DesktopCopySentinel VALUES (X'0102030405');";
                await command.ExecuteNonQueryAsync();
                Assert.True(File.Exists(source + "-wal"));
                var originalBytes = await ReadSharedAsync(source);
                await DesktopRuntime.CopyDatabaseAsync(source, destination);
                Assert.Equal(originalBytes, await ReadSharedAsync(source));
                await using var copied = new SqliteConnection($"Data Source={destination};Mode=ReadOnly;Pooling=False");
                await copied.OpenAsync();
                await using var query = copied.CreateCommand(); query.CommandText = "SELECT Value FROM DesktopCopySentinel";
                Assert.Equal(new byte[] { 1, 2, 3, 4, 5 }, (byte[])(await query.ExecuteScalarAsync())!);
                await Assert.ThrowsAsync<InvalidOperationException>(() => DesktopRuntime.CopyDatabaseAsync(source, destination));
            }
            Assert.Empty(Directory.GetFiles(folder, "*.copy-*"));
        }
        finally { Directory.Delete(folder, recursive: true); }
    }

    private static async Task<byte[]> ReadSharedAsync(string path)
    {
        await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
        using var result = new MemoryStream(); await stream.CopyToAsync(result); return result.ToArray();
    }

    [Fact]
    public async Task CorruptSourcesAndExistingDestinationsAreNeverReplaced()
    {
        var folder = Path.Combine(Path.GetTempPath(), "repetitio-desktop-tests-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(folder);
        var source = Path.Combine(folder, "source.db"); var destination = Path.Combine(folder, "destination.db");
        try
        {
            await File.WriteAllTextAsync(source, "not a SQLite database");
            await Assert.ThrowsAnyAsync<Exception>(() => DesktopRuntime.CopyDatabaseAsync(source, destination));
            Assert.False(File.Exists(destination));
            Assert.Equal("not a SQLite database", await File.ReadAllTextAsync(source));
            await File.WriteAllTextAsync(destination, "keep this existing data");
            await Assert.ThrowsAsync<InvalidOperationException>(() => DesktopRuntime.CopyDatabaseAsync(source, destination));
            Assert.Equal("keep this existing data", await File.ReadAllTextAsync(destination));
            await Assert.ThrowsAsync<InvalidOperationException>(() => DesktopRuntime.CopyDatabaseAsync(source, source));
        }
        finally { Directory.Delete(folder, recursive: true); }
    }

    [Fact]
    public async Task UnknownFutureSchemaIsRejectedWithoutMigration()
    {
        var file = Path.Combine(Path.GetTempPath(), "repetitio-desktop-future-" + Guid.NewGuid().ToString("N") + ".db");
        try
        {
            await using (var context = new RepetitioDbContext(new DbContextOptionsBuilder<RepetitioDbContext>().UseSqlite($"Data Source={file};Pooling=False").Options))
                await context.Database.MigrateAsync();
            await using (var connection = new SqliteConnection($"Data Source={file};Pooling=False"))
            {
                await connection.OpenAsync(); await using var command = connection.CreateCommand();
                command.CommandText = "INSERT INTO __EFMigrationsHistory VALUES ('20990101000000_Future', '99.0.0')";
                await command.ExecuteNonQueryAsync();
            }
            var bytes = await File.ReadAllBytesAsync(file);
            await Assert.ThrowsAsync<InvalidOperationException>(() => DesktopRuntime.ValidateDatabaseAsync(file));
            Assert.Equal(bytes, await File.ReadAllBytesAsync(file));
        }
        finally { if (File.Exists(file)) File.Delete(file); }
    }
}
