using System.Security.Cryptography;
using System.Text;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Repetitio.Infrastructure.Backup;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Api.Desktop;

public static class DesktopRuntime
{
    public const string TokenHeader = "X-Repetitio-Desktop-Token";

    public static bool IsAuthorized(string expected, string supplied)
    {
        if (expected.Length < 32 || supplied.Length != expected.Length) return false;
        return CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(supplied));
    }

    public static void Configure(WebApplication app)
    {
        if (!app.Configuration.GetValue<bool>("Desktop:Enabled")) return;
        var token = app.Configuration["Desktop:Token"] ?? "";
        if (token.Length < 32) throw new InvalidOperationException("Desktop mode requires a private session token.");
        app.Use(async (context, next) =>
        {
            if (context.Connection.RemoteIpAddress is null || !System.Net.IPAddress.IsLoopback(context.Connection.RemoteIpAddress)
                || !IsAuthorized(token, context.Request.Headers[TokenHeader].ToString()))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }
            await next(context);
        });
        app.MapPost("/api/desktop/shutdown", (IHostApplicationLifetime lifetime) =>
        {
            _ = Task.Run(async () => { await Task.Delay(200); lifetime.StopApplication(); });
            return Results.Accepted();
        });
    }

    public static async Task ValidateDatabaseAsync(string path)
    {
        if (!File.Exists(path)) throw new FileNotFoundException("The selected database does not exist.", path);
        var options = new DbContextOptionsBuilder<RepetitioDbContext>().UseSqlite("Data Source=:memory:").Options;
        using var context = new RepetitioDbContext(options);
        var known = context.Database.GetMigrations().ToArray();
        await using var connection = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = path, Mode = SqliteOpenMode.ReadOnly, Pooling = false }.ToString());
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT MigrationId FROM __EFMigrationsHistory ORDER BY MigrationId";
        var applied = new List<string>();
        await using (var reader = await command.ExecuteReaderAsync()) while (await reader.ReadAsync()) applied.Add(reader.GetString(0));
        if (!applied.Any() || !applied.SequenceEqual(known.Take(applied.Count)))
            throw new InvalidOperationException("This database has an unknown or newer schema. Install the matching or newer Repetitio release. No data was changed.");
        var manifest = new BackupManifest { Application = BackupManifest.ExpectedApplication, SchemaVersion = BackupManifest.CurrentSchemaVersion,
            CreatedAt = DateTimeOffset.UtcNow, DatabaseSchemaVersion = applied[^1] };
        var validation = await new BackupArchiveValidator().ValidateDatabaseAsync(path, known[^1], manifest);
        if (!validation.IsValid) throw new InvalidOperationException(validation.Message);
    }

    public static async Task CopyDatabaseAsync(string source, string destination)
    {
        source = Path.GetFullPath(source); destination = Path.GetFullPath(destination);
        if (string.Equals(source, destination, OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal))
            throw new InvalidOperationException("Copy destination must be different from the original database.");
        if (File.Exists(destination)) throw new InvalidOperationException("The Windows database already exists. Use Settings > Import Data to replace it safely.");
        Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
        var temporary = destination + ".copy-" + Guid.NewGuid().ToString("N");
        try
        {
            // SQLite's backup API includes committed WAL data; copying only the .db file would lose it.
            await using (var input = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = source, Mode = SqliteOpenMode.ReadOnly, Pooling = false }.ToString()))
            await using (var output = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = temporary, Pooling = false }.ToString()))
            {
                await input.OpenAsync(); await output.OpenAsync(); input.BackupDatabase(output);
            }
            await ValidateDatabaseAsync(temporary);
            File.Move(temporary, destination, overwrite: false);
        }
        finally
        {
            foreach (var file in new[] { temporary, temporary + "-wal", temporary + "-shm" }) if (File.Exists(file)) File.Delete(file);
        }
    }

    public static async Task<int?> RunDataCommandAsync(string[] args)
    {
        if (args.Length == 1 && args[0] == "--health-check")
        {
            try
            {
                using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
                using var response = await client.GetAsync("http://127.0.0.1:8080/api/health");
                return response.IsSuccessStatusCode ? 0 : 1;
            }
            catch { return 1; }
        }
        if (args.Contains("--desktop-restore-backup"))
        {
            try
            {
                if (args.Length != 4 || args[0] != "--desktop-restore-backup" || args[2] != "--desktop-copy-output")
                    throw new ArgumentException("Usage: --desktop-restore-backup BACKUP.zip --desktop-copy-output DESTINATION");
                await DesktopRecovery.RestoreAsync(args[1], args[3]); return 0;
            }
            catch (Exception exception) { Console.Error.WriteLine(exception.Message); return 1; }
        }
        if (!args.Contains("--desktop-copy-database")) return null;
        try
        {
            if (args.Length != 4 || args[0] != "--desktop-copy-database" || args[2] != "--desktop-copy-output")
                throw new ArgumentException("Usage: --desktop-copy-database SOURCE --desktop-copy-output DESTINATION");
            await CopyDatabaseAsync(args[1], args[3]);
            Console.WriteLine("Database copied and validated. Original data was not modified.");
            return 0;
        }
        catch (Exception exception) { Console.Error.WriteLine(exception.Message); return 1; }
    }
}
