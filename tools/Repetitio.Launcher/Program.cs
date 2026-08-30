using System.Diagnostics;

namespace Repetitio.Launcher;

/// <summary>
/// Starts and stops the local Repetitio Docker Compose stack.
/// </summary>
internal static class Program
{
    private const string FrontendUrl = "http://localhost:3000";

    /// <summary>
    /// Runs the launcher command.
    /// </summary>
    /// <param name="args">Optional command arguments: start, stop, restart, status.</param>
    /// <returns>The process exit code.</returns>
    public static async Task<int> Main(string[] args)
    {
        var workspace = FindWorkspaceRoot(AppContext.BaseDirectory);

        if (workspace is null)
        {
            Console.Error.WriteLine("Could not find docker-compose.yml for Repetitio.");
            return 1;
        }

        var command = args.FirstOrDefault()?.Trim().ToLowerInvariant() ?? ReadInteractiveCommand();

        return command switch
        {
            "start" => await StartAsync(workspace),
            "stop" => await StopAsync(workspace),
            "restart" => await RestartAsync(workspace),
            "status" => await StatusAsync(workspace),
            "exit" => 0,
            _ => WriteUsage()
        };
    }

    /// <summary>
    /// Starts the Docker Compose stack and opens the frontend.
    /// </summary>
    /// <param name="workspace">The Repetitio workspace root.</param>
    /// <returns>The process exit code.</returns>
    private static async Task<int> StartAsync(string workspace)
    {
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
    private static Task<int> StopAsync(string workspace)
    {
        return RunDockerComposeAsync(workspace, "down");
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

        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
        await process.WaitForExitAsync();

        return process.ExitCode;
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
        Console.WriteLine("1. Start");
        Console.WriteLine("2. Stop");
        Console.WriteLine("3. Restart");
        Console.WriteLine("4. Status");
        Console.WriteLine("0. Exit");
        Console.Write("Choose: ");

        return Console.ReadLine()?.Trim() switch
        {
            "1" => "start",
            "2" => "stop",
            "3" => "restart",
            "4" => "status",
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
        Console.WriteLine("Usage: Repetitio.exe [start|stop|restart|status]");
        return 1;
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
}
