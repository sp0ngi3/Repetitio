using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Repetitio.Application.Basics;

namespace Repetitio.Api.Execution;

/// <summary>
/// Compiles and executes C# submissions for built-in Basics exercises.
/// </summary>
public sealed class BasicExerciseExecutionService
{
    /// <summary>
    /// Execution harnesses keyed by exercise slug.
    /// </summary>
    private readonly IReadOnlyDictionary<string, IBasicExerciseHarness> harnessesBySlug;

    /// <summary>
    /// Maximum accepted source code length.
    /// </summary>
    private const int MaximumSourceCodeLength = 20_000;

    /// <summary>
    /// Minimum execution timeout in milliseconds.
    /// </summary>
    private const int MinimumTimeoutMs = 500;

    /// <summary>
    /// Maximum execution timeout in milliseconds.
    /// </summary>
    private const int MaximumTimeoutMs = 5_000;

    /// <summary>
    /// Initializes a new instance of the <see cref="BasicExerciseExecutionService"/> class.
    /// </summary>
    /// <param name="harnesses">The registered Basics exercise harnesses.</param>
    public BasicExerciseExecutionService(IEnumerable<IBasicExerciseHarness> harnesses)
    {
        harnessesBySlug = harnesses.ToDictionary(
            harness => harness.Slug,
            StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Compiles and executes a submitted Basics exercise solution.
    /// </summary>
    /// <param name="exercise">The exercise definition.</param>
    /// <param name="request">The execution request.</param>
    /// <param name="cancellationToken">The request cancellation token.</param>
    /// <returns>The compilation and execution result.</returns>
    public async Task<ExecuteBasicExerciseResponse> ExecuteAsync(
        BasicExerciseResponse exercise,
        ExecuteBasicExerciseRequest request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(exercise);
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.SourceCode))
        {
            return CreateCompilationFailure("Source code is required.");
        }

        if (request.SourceCode.Length > MaximumSourceCodeLength)
        {
            return CreateCompilationFailure($"Source code cannot exceed {MaximumSourceCodeLength} characters.");
        }

        if (!harnessesBySlug.TryGetValue(exercise.Slug, out var harness))
        {
            return CreateCompilationFailure("This Basics exercise does not have an execution harness yet.");
        }

        var timeoutMs = Math.Clamp(request.TimeoutMs ?? 3_000, MinimumTimeoutMs, MaximumTimeoutMs);
        var workspace = Path.Combine(Path.GetTempPath(), "repetitio-basics", Guid.NewGuid().ToString("N"));

        Directory.CreateDirectory(workspace);

        try
        {
            var assemblyPath = Path.Combine(workspace, "SubmissionRunner.dll");
            var compilationResult = CompileSubmission(
                harness.CreateProgram(request.SourceCode),
                assemblyPath);

            if (!compilationResult.Success)
            {
                return new ExecuteBasicExerciseResponse
                {
                    Compiled = false,
                    TimedOut = false,
                    Passed = false,
                    CompilerOutput = compilationResult.Output,
                    TestResults = []
                };
            }

            await File.WriteAllTextAsync(
                Path.Combine(workspace, "SubmissionRunner.runtimeconfig.json"),
                CreateRuntimeConfig(),
                Encoding.UTF8,
                cancellationToken);

            var runResult = await RunDotnetAsync(
                workspace,
                [assemblyPath],
                TimeSpan.FromMilliseconds(timeoutMs),
                cancellationToken);

            if (runResult.TimedOut)
            {
                return new ExecuteBasicExerciseResponse
                {
                    Compiled = true,
                    TimedOut = true,
                    Passed = false,
                    RuntimeOutput = MergeOutput("Execution timed out.", runResult),
                    TestResults = []
                };
            }

            var testResults = ParseTestResults(runResult.Output);
            var passed = runResult.ExitCode == 0 && testResults.Count > 0 && testResults.All(test => test.Passed);

            return new ExecuteBasicExerciseResponse
            {
                Compiled = true,
                TimedOut = false,
                Passed = passed,
                CompilerOutput = compilationResult.Output,
                RuntimeOutput = StripResultMarker(runResult.Output),
                TestResults = testResults
            };
        }
        finally
        {
            TryDeleteWorkspace(workspace);
        }
    }

    /// <summary>
    /// Creates a response for requests that cannot be compiled.
    /// </summary>
    /// <param name="message">The compiler-style message to return.</param>
    /// <returns>A failed execution response.</returns>
    private static ExecuteBasicExerciseResponse CreateCompilationFailure(string message)
    {
        return new ExecuteBasicExerciseResponse
        {
            Compiled = false,
            TimedOut = false,
            Passed = false,
            CompilerOutput = message,
            TestResults = []
        };
    }

    /// <summary>
    /// Compiles a generated C# harness into an executable assembly.
    /// </summary>
    /// <param name="sourceCode">The generated C# harness source.</param>
    /// <param name="assemblyPath">The output assembly path.</param>
    /// <returns>The compilation result.</returns>
    private static CompilationResult CompileSubmission(string sourceCode, string assemblyPath)
    {
        var syntaxTree = CSharpSyntaxTree.ParseText(
            sourceCode,
            CSharpParseOptions.Default.WithLanguageVersion(LanguageVersion.Preview));

        var references = GetTrustedPlatformReferences();
        var compilation = CSharpCompilation.Create(
            Path.GetFileNameWithoutExtension(assemblyPath),
            [syntaxTree],
            references,
            new CSharpCompilationOptions(
                OutputKind.ConsoleApplication,
                optimizationLevel: OptimizationLevel.Release,
                nullableContextOptions: NullableContextOptions.Enable));

        using var assemblyStream = File.Create(assemblyPath);
        var emitResult = compilation.Emit(assemblyStream);
        var output = FormatDiagnostics(emitResult.Diagnostics);

        return new CompilationResult(emitResult.Success, output);
    }

    /// <summary>
    /// Creates metadata references from the runtime assemblies available to the API process.
    /// </summary>
    /// <returns>Metadata references for Roslyn compilation.</returns>
    private static IReadOnlyCollection<MetadataReference> GetTrustedPlatformReferences()
    {
        var trustedAssemblies = (string?)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") ?? string.Empty;

        return trustedAssemblies
            .Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries)
            .Select(path => MetadataReference.CreateFromFile(path))
            .ToArray();
    }

    /// <summary>
    /// Formats compiler diagnostics for the API response.
    /// </summary>
    /// <param name="diagnostics">The compiler diagnostics.</param>
    /// <returns>The formatted diagnostic text.</returns>
    private static string? FormatDiagnostics(IEnumerable<Diagnostic> diagnostics)
    {
        var importantDiagnostics = diagnostics
            .Where(diagnostic => diagnostic.Severity >= DiagnosticSeverity.Warning)
            .Select(diagnostic => diagnostic.ToString())
            .ToArray();

        return importantDiagnostics.Length == 0 ? null : string.Join(Environment.NewLine, importantDiagnostics);
    }

    /// <summary>
    /// Creates the runtime configuration required to execute the compiled harness assembly.
    /// </summary>
    /// <returns>The runtime configuration JSON.</returns>
    private static string CreateRuntimeConfig()
    {
        var runtimeVersion = Environment.Version.ToString();

        return $$"""
{
  "runtimeOptions": {
    "tfm": "net10.0",
    "framework": {
      "name": "Microsoft.NETCore.App",
      "version": "{{runtimeVersion}}"
    }
  }
}
""";
    }

    /// <summary>
    /// Runs a dotnet command with timeout and captured output.
    /// </summary>
    /// <param name="workingDirectory">The process working directory.</param>
    /// <param name="arguments">The dotnet arguments.</param>
    /// <param name="timeout">The maximum allowed duration.</param>
    /// <param name="cancellationToken">The request cancellation token.</param>
    /// <returns>The completed process result.</returns>
    private static async Task<ExecutionProcessResult> RunDotnetAsync(
        string workingDirectory,
        IReadOnlyCollection<string> arguments,
        TimeSpan timeout,
        CancellationToken cancellationToken)
    {
        using var process = new Process();
        process.StartInfo.FileName = "dotnet";
        process.StartInfo.WorkingDirectory = workingDirectory;
        process.StartInfo.RedirectStandardOutput = true;
        process.StartInfo.RedirectStandardError = true;
        process.StartInfo.UseShellExecute = false;
        process.StartInfo.CreateNoWindow = true;
        process.StartInfo.Environment["DOTNET_CLI_HOME"] = workingDirectory;
        process.StartInfo.Environment["DOTNET_SKIP_FIRST_TIME_EXPERIENCE"] = "1";
        process.StartInfo.Environment["DOTNET_NOLOGO"] = "1";
        process.StartInfo.Environment["DOTNET_ADD_GLOBAL_TOOLS_TO_PATH"] = "0";
        process.StartInfo.Environment["NUGET_PACKAGES"] = Path.Combine(workingDirectory, "packages");

        foreach (var argument in arguments)
        {
            process.StartInfo.ArgumentList.Add(argument);
        }

        process.Start();

        var outputTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var errorTask = process.StandardError.ReadToEndAsync(cancellationToken);

        try
        {
            await process.WaitForExitAsync(cancellationToken).WaitAsync(timeout, cancellationToken);
        }
        catch (TimeoutException)
        {
            TryKillProcess(process);
            await process.WaitForExitAsync(CancellationToken.None);

            return new ExecutionProcessResult(
                -1,
                true,
                await outputTask,
                await errorTask);
        }

        return new ExecutionProcessResult(
            process.ExitCode,
            false,
            await outputTask,
            await errorTask);
    }

    /// <summary>
    /// Parses serialized harness test results from process output.
    /// </summary>
    /// <param name="output">The process standard output.</param>
    /// <returns>The parsed test results.</returns>
    private static IReadOnlyCollection<BasicExerciseTestResultResponse> ParseTestResults(string output)
    {
        var markerIndex = output.LastIndexOf(BasicExerciseExecutionMarkers.ResultsMarker, StringComparison.Ordinal);

        if (markerIndex < 0)
        {
            return
            [
                new BasicExerciseTestResultResponse
                {
                    Name = "test harness",
                    Passed = false,
                    Expected = "serialized test results",
                    Actual = "missing result marker",
                    Error = "The program exited before the test harness could report results."
                }
            ];
        }

        var json = output[(markerIndex + BasicExerciseExecutionMarkers.ResultsMarker.Length)..].Trim();
        var lineBreakIndex = json.IndexOfAny(['\r', '\n']);

        if (lineBreakIndex >= 0)
        {
            json = json[..lineBreakIndex];
        }

        return JsonSerializer.Deserialize<IReadOnlyCollection<BasicExerciseTestResultResponse>>(json) ?? [];
    }

    /// <summary>
    /// Removes the serialized harness payload from runtime output.
    /// </summary>
    /// <param name="output">The raw process standard output.</param>
    /// <returns>User-visible runtime output.</returns>
    private static string? StripResultMarker(string output)
    {
        var markerIndex = output.LastIndexOf(BasicExerciseExecutionMarkers.ResultsMarker, StringComparison.Ordinal);

        if (markerIndex < 0)
        {
            return string.IsNullOrWhiteSpace(output) ? null : output.Trim();
        }

        var visibleOutput = output[..markerIndex].Trim();
        return string.IsNullOrWhiteSpace(visibleOutput) ? null : visibleOutput;
    }

    /// <summary>
    /// Merges stdout and stderr into a compact response string.
    /// </summary>
    /// <param name="prefix">An optional message to place before process output.</param>
    /// <param name="result">The process result.</param>
    /// <returns>The merged output.</returns>
    private static string? MergeOutput(string? prefix, ExecutionProcessResult result)
    {
        var parts = new[] { prefix, result.Output, result.Error }
            .Where(part => !string.IsNullOrWhiteSpace(part))
            .Select(part => part!.Trim());

        var output = string.Join(Environment.NewLine, parts);
        return string.IsNullOrWhiteSpace(output) ? null : output;
    }

    /// <summary>
    /// Attempts to kill a still-running process and all child processes.
    /// </summary>
    /// <param name="process">The process to kill.</param>
    private static void TryKillProcess(Process process)
    {
        try
        {
            if (!process.HasExited)
            {
                process.Kill(entireProcessTree: true);
            }
        }
        catch (InvalidOperationException)
        {
            // The process exited between the state check and kill request.
        }
    }

    /// <summary>
    /// Attempts to remove the temporary execution workspace.
    /// </summary>
    /// <param name="workspace">The temporary workspace path.</param>
    private static void TryDeleteWorkspace(string workspace)
    {
        try
        {
            Directory.Delete(workspace, recursive: true);
        }
        catch (IOException)
        {
            // Temporary files are best-effort cleanup.
        }
        catch (UnauthorizedAccessException)
        {
            // Temporary files are best-effort cleanup.
        }
    }

    /// <summary>
    /// Captures a finished process exit code and output streams.
    /// </summary>
    /// <param name="ExitCode">The process exit code.</param>
    /// <param name="TimedOut">A value indicating whether the process exceeded its timeout.</param>
    /// <param name="Output">The standard output text.</param>
    /// <param name="Error">The standard error text.</param>
    private sealed record ExecutionProcessResult(int ExitCode, bool TimedOut, string Output, string Error);

    /// <summary>
    /// Captures the result of compiling a generated submission harness.
    /// </summary>
    /// <param name="Success">A value indicating whether compilation succeeded.</param>
    /// <param name="Output">The formatted compiler diagnostics.</param>
    private sealed record CompilationResult(bool Success, string? Output);
}
