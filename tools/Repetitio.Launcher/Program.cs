using System.Diagnostics;
using System.Net.Http.Json;

namespace Repetitio.Launcher;

/// <summary>
/// Starts and stops the local Repetitio Docker Compose stack.
/// </summary>
internal static class Program
{
    private const string FrontendUrl = "http://localhost:3000";
    private const string AutomaticShutdownBackupUrl = "http://localhost:8080/api/backup/automatic-shutdown";
    private static readonly TimeSpan DockerStartupTimeout = TimeSpan.FromMinutes(2);

    /// <summary>
    /// Runs the launcher command.
    /// </summary>
    /// <param name="args">Optional command arguments: run, start, stop, restart, status.</param>
    /// <returns>The process exit code.</returns>
    public static async Task<int> Main(string[] args)
    {
        var workspace = FindWorkspaceRoot(AppContext.BaseDirectory);
        var isInteractive = args.Length == 0;

        if (workspace is null)
        {
            Console.Error.WriteLine("Could not find docker-compose.yml for Repetitio.");
            PauseIfInteractive(isInteractive);
            return 1;
        }

        var command = isInteractive ? ReadInteractiveCommand() : args.First().Trim().ToLowerInvariant();
        var exitCode = command switch
        {
            "run" => await RunUntilEnterAsync(workspace),
            "start" => await StartAsync(workspace),
            "stop" => await StopAsync(workspace),
            "restart" => await RestartAsync(workspace),
            "status" => await StatusAsync(workspace),
            "exit" => 0,
            _ => WriteUsage()
        };

        PauseIfInteractive(isInteractive && command is not "run" and not "exit");
        return exitCode;
    }

    /// <summary>
    /// Starts Repetitio, waits for the user, and then stops the Docker Compose stack.
    /// </summary>
    /// <param name="workspace">The Repetitio workspace root.</param>
    /// <returns>The process exit code.</returns>
    private static async Task<int> RunUntilEnterAsync(string workspace)
    {
        var exitCode = await StartAsync(workspace);

        if (exitCode != 0)
        {
            Console.WriteLine("Startup failed. Press Enter to close this window.");
            Console.ReadLine();
            return exitCode;
        }

        Console.WriteLine();
        Console.WriteLine("Repetitio is running.");
        Console.WriteLine($"Frontend: {FrontendUrl}");
        Console.WriteLine("API:      http://localhost:8080");
        Console.WriteLine();
        Console.WriteLine("Press Enter to stop Repetitio.");
        Console.ReadLine();

        return await StopAsync(workspace);
    }

    /// <summary>
    /// Starts the Docker Compose stack and opens the frontend.
    /// </summary>
    /// <param name="workspace">The Repetitio workspace root.</param>
    /// <returns>The process exit code.</returns>
    private static async Task<int> StartAsync(string workspace)
    {
        if (!await EnsureDockerReadyAsync())
        {
            return 1;
        }

        var exitCode = await RunDockerComposeAsync(workspace, "up", "-d", "--build");

        if (exitCode == 0)
        {
            OpenFrontend();
        }

        return exitCode;
    }

    /// <summary>
    /// Stops the Docker Compose stack.
    /// </summary>
    /// <param name="workspace">The Repetitio workspace root.</param>
    /// <returns>The process exit code.</returns>
    private static async Task<int> StopAsync(string workspace)
    {
        await CreateAutomaticShutdownBackupAsync();

        return await RunDockerComposeAsync(workspace, "down");
    }

    /// <summary>
    /// Restarts the Docker Compose stack.
    /// </summary>
    /// <param name="workspace">The Repetitio workspace root.</param>
    /// <returns>The process exit code.</returns>
    private static async Task<int> RestartAsync(string workspace)
    {
        var stopExitCode = await StopAsync(workspace);

        return stopExitCode == 0 ? await StartAsync(workspace) : stopExitCode;
    }

    /// <summary>
    /// Prints the current Docker Compose status.
    /// </summary>
    /// <param name="workspace">The Repetitio workspace root.</param>
    /// <returns>The process exit code.</returns>
    private static Task<int> StatusAsync(string workspace)
    {
        return RunDockerComposeAsync(workspace, "ps");
    }

    /// <summary>
    /// Requests a retained automatic backup before stopping the local stack.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    private static async Task CreateAutomaticShutdownBackupAsync()
    {
        try
        {
            using var httpClient = new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(12)
            };

            using var response = await httpClient.PostAsync(AutomaticShutdownBackupUrl, content: null);

            if (!response.IsSuccessStatusCode)
            {
                Console.WriteLine($"Automatic backup skipped: API returned {(int)response.StatusCode}.");
                return;
            }

            var result = await response.Content.ReadFromJsonAsync<AutomaticBackupResponse>();
            Console.WriteLine(result is null
                ? "Automatic backup created."
                : $"Automatic backup created: {result.FileName}. Retained automatic backups: {result.RetainedAutomaticBackupCount}/3.");
        }
        catch (HttpRequestException)
        {
            Console.WriteLine("Automatic backup skipped: API is not reachable.");
        }
        catch (TaskCanceledException)
        {
            Console.WriteLine("Automatic backup skipped: API did not respond in time.");
        }
    }

    /// <summary>
    /// Runs a Docker Compose command in the workspace.
    /// </summary>
    /// <param name="workspace">The Repetitio workspace root.</param>
    /// <param name="arguments">The Docker Compose arguments.</param>
    /// <returns>The process exit code.</returns>
    private static async Task<int> RunDockerComposeAsync(string workspace, params string[] arguments)
    {
        using var process = new Process();
        process.StartInfo.FileName = "docker";
        process.StartInfo.WorkingDirectory = workspace;
        process.StartInfo.UseShellExecute = false;
        process.StartInfo.RedirectStandardOutput = true;
        process.StartInfo.RedirectStandardError = true;
        process.StartInfo.ArgumentList.Add("compose");

        foreach (var argument in arguments)
        {
            process.StartInfo.ArgumentList.Add(argument);
        }

        process.OutputDataReceived += (_, eventArgs) => WriteLine(eventArgs.Data, Console.Out);
        process.ErrorDataReceived += (_, eventArgs) => WriteLine(eventArgs.Data, Console.Error);

        try
        {
            process.Start();
        }
        catch (System.ComponentModel.Win32Exception)
        {
            Console.Error.WriteLine("Docker CLI was not found. Install Docker Desktop and ensure 'docker' is available in PATH.");
            return 1;
        }

        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
        await process.WaitForExitAsync();

        return process.ExitCode;
    }

    /// <summary>
    /// Ensures that Docker Desktop and its engine are ready before Compose is invoked.
    /// </summary>
    /// <returns><see langword="true"/> when Docker is ready.</returns>
    private static async Task<bool> EnsureDockerReadyAsync()
    {
        var probe = await ProbeDockerAsync();
        if (probe == DockerProbeResult.Ready)
        {
            return true;
        }

        if (probe == DockerProbeResult.CliMissing)
        {
            Console.Error.WriteLine("Docker is not installed or its command-line tool is unavailable.");
            Console.Error.WriteLine("Install Docker Desktop from https://www.docker.com/products/docker-desktop/ and try again.");
            return false;
        }

        Console.WriteLine("Docker engine is not running. Starting Docker Desktop...");
        if (!TryStartDockerDesktop())
        {
            Console.Error.WriteLine("Docker Desktop could not be started automatically.");
            Console.Error.WriteLine("Open Docker Desktop manually, wait until it is ready, and run Repetitio again.");
            return false;
        }

        var deadline = DateTime.UtcNow + DockerStartupTimeout;
        while (DateTime.UtcNow < deadline)
        {
            await Task.Delay(TimeSpan.FromSeconds(3));
            if (await ProbeDockerAsync() == DockerProbeResult.Ready)
            {
                Console.WriteLine("Docker is ready.");
                return true;
            }

            Console.Write(".");
        }

        Console.WriteLine();
        Console.Error.WriteLine("Docker Desktop did not become ready within two minutes.");
        Console.Error.WriteLine("Check Docker Desktop for an error, then run Repetitio again.");
        return false;
    }

    private static async Task<DockerProbeResult> ProbeDockerAsync()
    {
        using var process = new Process();
        process.StartInfo.FileName = "docker";
        process.StartInfo.UseShellExecute = false;
        process.StartInfo.CreateNoWindow = true;
        process.StartInfo.RedirectStandardOutput = true;
        process.StartInfo.RedirectStandardError = true;
        process.StartInfo.ArgumentList.Add("info");
        process.StartInfo.ArgumentList.Add("--format");
        process.StartInfo.ArgumentList.Add("{{.ServerVersion}}");

        try
        {
            process.Start();
        }
        catch (System.ComponentModel.Win32Exception)
        {
            return DockerProbeResult.CliMissing;
        }

        await process.WaitForExitAsync();
        return process.ExitCode == 0 ? DockerProbeResult.Ready : DockerProbeResult.EngineUnavailable;
    }

    private static bool TryStartDockerDesktop()
    {
        var candidatePaths = new[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Docker", "Docker", "Docker Desktop.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Docker", "Docker Desktop.exe")
        };

        var executable = candidatePaths.FirstOrDefault(File.Exists);
        if (executable is null)
        {
            return false;
        }

        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = executable,
                UseShellExecute = true
            });
            return true;
        }
        catch (Exception exception) when (exception is InvalidOperationException or System.ComponentModel.Win32Exception)
        {
            return false;
        }
    }

    /// <summary>
    /// Opens the frontend URL in the default browser.
    /// </summary>
    private static void OpenFrontend()
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = FrontendUrl,
                UseShellExecute = true
            });
        }
        catch (InvalidOperationException)
        {
            Console.WriteLine($"Open {FrontendUrl} manually.");
        }
        catch (System.ComponentModel.Win32Exception)
        {
            Console.WriteLine($"Open {FrontendUrl} manually.");
        }
    }

    /// <summary>
    /// Reads a command from the interactive menu.
    /// </summary>
    /// <returns>The selected launcher command.</returns>
    private static string ReadInteractiveCommand()
    {
        Console.WriteLine("Repetitio");
        Console.WriteLine("1. Run until Enter, then stop");
        Console.WriteLine("2. Start and keep running");
        Console.WriteLine("3. Stop");
        Console.WriteLine("4. Restart");
        Console.WriteLine("5. Status");
        Console.WriteLine("0. Exit");
        Console.Write("Choose: ");

        return Console.ReadLine()?.Trim() switch
        {
            "1" => "run",
            "2" => "start",
            "3" => "stop",
            "4" => "restart",
            "5" => "status",
            "0" => "exit",
            var value => value ?? "exit"
        };
    }

    /// <summary>
    /// Finds the workspace root by walking up from a starting directory.
    /// </summary>
    /// <param name="startDirectory">The directory where the search begins.</param>
    /// <returns>The workspace root when found; otherwise, <see langword="null"/>.</returns>
    private static string? FindWorkspaceRoot(string startDirectory)
    {
        var directory = new DirectoryInfo(startDirectory);

        while (directory is not null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "docker-compose.yml")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        var currentDirectory = Directory.GetCurrentDirectory();
        return File.Exists(Path.Combine(currentDirectory, "docker-compose.yml")) ? currentDirectory : null;
    }

    /// <summary>
    /// Writes launcher usage details.
    /// </summary>
    /// <returns>A failing process exit code.</returns>
    private static int WriteUsage()
    {
        Console.WriteLine("Usage: 00-REPETITIO.exe [run|start|stop|restart|status]");
        return 1;
    }

    /// <summary>
    /// Keeps the console window open after interactive commands.
    /// </summary>
    /// <param name="shouldPause">Whether the launcher should wait before closing.</param>
    private static void PauseIfInteractive(bool shouldPause)
    {
        if (!shouldPause)
        {
            return;
        }

        Console.WriteLine();
        Console.WriteLine("Press Enter to close this window.");
        Console.ReadLine();
    }

    /// <summary>
    /// Writes a process output line when it is present.
    /// </summary>
    /// <param name="line">The output line.</param>
    /// <param name="writer">The output writer.</param>
    private static void WriteLine(string? line, TextWriter writer)
    {
        if (!string.IsNullOrWhiteSpace(line))
        {
            writer.WriteLine(line);
        }
    }

    /// <summary>
    /// Represents the automatic backup API response.
    /// </summary>
    private sealed record AutomaticBackupResponse
    {
        /// <summary>
        /// Gets the automatic backup file name.
        /// </summary>
        public string FileName { get; init; } = string.Empty;

        /// <summary>
        /// Gets the number of retained automatic backups.
        /// </summary>
        public int RetainedAutomaticBackupCount { get; init; }
    }

    private enum DockerProbeResult
    {
        Ready,
        CliMissing,
        EngineUnavailable
    }
}
