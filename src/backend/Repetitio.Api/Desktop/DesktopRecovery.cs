using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Repetitio.Infrastructure.Backup;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Api.Desktop;

public static class DesktopRecovery
{
    public static async Task RestoreAsync(string archivePath, string databasePath)
    {
        databasePath = Path.GetFullPath(databasePath);
        var dataDirectory = Path.GetDirectoryName(databasePath)!;
        using var schema = new RepetitioDbContext(new DbContextOptionsBuilder<RepetitioDbContext>().UseSqlite("Data Source=:memory:").Options);
        await using var input = File.OpenRead(archivePath);
        using var backup = await new BackupArchiveValidator().ValidateArchiveAsync(input, schema.Database.GetMigrations().Last());
        if (!backup.Validation.IsValid) throw new InvalidOperationException(backup.Validation.Message);

        Directory.CreateDirectory(dataDirectory);
        var temporary = Path.Combine(dataDirectory, $"restore-{Guid.NewGuid():N}.db");
        var recovery = Path.Combine(Path.GetDirectoryName(dataDirectory)!, "backups", $"recovery-original-{DateTime.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}");
        var moved = new List<(string Original, string Saved)>();
        var journal = databasePath + ".restore-pending.json";
        var hadJournal = File.Exists(journal);
        var ownsJournal = false;
        var completed = false;
        var stable = false;
        try
        {
            await DesktopRuntime.CopyDatabaseAsync(backup.DatabasePath, temporary);
            Directory.CreateDirectory(recovery);
            if (hadJournal) File.Copy(journal, Path.Combine(recovery, "previous-recovery.json"), overwrite: false);
            ownsJournal = true;
            await File.WriteAllTextAsync(journal, JsonSerializer.Serialize(new { databasePath, temporary, recovery }));
            // Called only after stopping the local API. Preserve even unreadable originals and their WAL.
            foreach (var file in new[] { databasePath, databasePath + "-wal", databasePath + "-shm" })
            {
                if (!File.Exists(file)) continue;
                var saved = Path.Combine(recovery, Path.GetFileName(file));
                File.Move(file, saved, overwrite: false);
                moved.Add((file, saved));
            }
            File.Move(temporary, databasePath, overwrite: false);
            completed = true;
            stable = true;
            Console.WriteLine($"Backup restored. Previous database files retained in: {recovery}");
        }
        catch
        {
            foreach (var file in moved.AsEnumerable().Reverse())
                if (!File.Exists(file.Original)) File.Move(file.Saved, file.Original, overwrite: false);
            stable = true;
            throw;
        }
        finally
        {
            if (File.Exists(temporary)) File.Delete(temporary);
            if (ownsJournal && stable && (!hadJournal || completed) && File.Exists(journal)) File.Delete(journal);
        }
    }
}
