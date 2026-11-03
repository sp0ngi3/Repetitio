using System.Net;
using System.Net.Sockets;
using System.Text.Json;
using Microsoft.AspNetCore.Http.Features;
using Repetitio.Api.Execution.Harnesses;
using Repetitio.Application.Basics;

namespace Repetitio.Api.Execution;

/// <summary>Routes hosted submissions to the private runner. Desktop and local Docker use the existing executor.</summary>
public sealed class HostedBasicsRunner(HttpClient client, IConfiguration configuration)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly SemaphoreSlim JobSlot = new(1, 1);
    private const int MaxResponseBytes = 256 * 1024;
    public bool Enabled => configuration.GetValue<bool>("Hosted:Enabled");

    internal static SocketsHttpHandler CreateTransport(IConfiguration configuration)
    {
        var handler = new SocketsHttpHandler { AllowAutoRedirect = false, UseProxy = false };
        if (!configuration.GetValue<bool>("Hosted:Enabled") ||
            configuration["Hosted:RunnerSocket"] is not { Length: > 0 } path)
            return handler;

        var endpoint = new UnixDomainSocketEndPoint(path);
        handler.ConnectCallback = async (_, cancellationToken) =>
        {
            var socket = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);
            try
            {
                await socket.ConnectAsync(endpoint, cancellationToken);
                return new NetworkStream(socket, ownsSocket: true);
            }
            catch
            {
                socket.Dispose();
                throw;
            }
        };
        return handler;
    }

    public static void Configure(WebApplication app)
    {
        if (!app.Configuration.GetValue<bool>("Hosted:Enabled")) return;

        if (!app.Environment.IsProduction() || app.Configuration.GetValue<bool>("Desktop:Enabled"))
            throw new InvalidOperationException("Hosted mode requires Production with desktop mode disabled.");

        var origin = app.Configuration["Hosted:Origin"];
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var publicUri) || publicUri.Scheme != "https" ||
            origin != publicUri.GetLeftPart(UriPartial.Authority) || publicUri.UserInfo.Length != 0)
            throw new InvalidOperationException("Hosted:Origin must be the canonical HTTPS origin without a trailing slash.");

        if (!Uri.TryCreate(app.Configuration["Hosted:RunnerUrl"], UriKind.Absolute, out var runner) ||
            runner.Scheme is not ("http" or "https") || runner.UserInfo.Length != 0)
            throw new InvalidOperationException("Hosted:RunnerUrl must point to the private Basics runner.");

        app.Use(async (context, next) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            var method = context.Request.Method;
            if (!HttpMethods.IsGet(method) && !HttpMethods.IsHead(method) && !HttpMethods.IsOptions(method) &&
                !string.Equals(context.Request.Headers.Origin.ToString(), origin, StringComparison.Ordinal))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsync("Hosted writes require the configured Origin.");
                return;
            }

            if (HttpMethods.IsPost(method) && context.Request.Path.StartsWithSegments("/api/basics", out var route) &&
                route.Value?.EndsWith("/execute", StringComparison.OrdinalIgnoreCase) == true &&
                context.Features.Get<IHttpMaxRequestBodySizeFeature>() is { IsReadOnly: false } size)
                size.MaxRequestBodySize = 128 * 1024;

            await next(context);
        });
    }

    public async Task<IResult> ExecuteAsync(string slug, ExecuteBasicExerciseRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.SourceCode) || request.SourceCode.Length > BasicExerciseExecutionService.MaximumSourceCodeLength)
            return Results.BadRequest($"Source code must contain 1–{BasicExerciseExecutionService.MaximumSourceCodeLength} characters.");

        if (!await JobSlot.WaitAsync(0, cancellationToken))
            return Results.Text("Basics runner is busy. Try again shortly.", statusCode: 429);

        try
        {
            client.MaxResponseContentBufferSize = MaxResponseBytes;
            using var payload = new ByteArrayContent(JsonSerializer.SerializeToUtf8Bytes(new Submission(slug, request), JsonOptions));
            payload.Headers.ContentType = new("application/json");
            // Keep the slot until the broker finishes, even if the browser closes the request.
            using var response = await client.PostAsync(configuration["Hosted:RunnerUrl"], payload, CancellationToken.None);
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
                return Results.Text("Basics runner is busy. Try again shortly.", statusCode: 429);
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<ExecuteBasicExerciseResponse>();
                if (result?.TestResults is not null) return Results.Ok(result);
            }
        }
        catch (Exception error) when (error is HttpRequestException or OperationCanceledException or JsonException)
        {
            // Hosted mode never falls back to executing submissions in the API.
        }
        finally
        {
            JobSlot.Release();
        }

        return Results.Text("The isolated Basics runner is unavailable. Try again shortly.", statusCode: 503);
    }

    public static async Task<int> RunSubmissionAsync()
    {
        var line = await Console.In.ReadLineAsync();
        if (line is null) return 2;
        var submission = JsonSerializer.Deserialize<Submission>(line, JsonOptions);
        if (submission is null || BasicExerciseCatalog.GetBySlug(submission.Slug) is not { } exercise)
            return 2;

        var executor = new BasicExerciseExecutionService([new ReverseLinkedListHarness(), .. BasicExerciseHarnessCatalog.GetAll()]);
        var result = await executor.ExecuteAsync(exercise, submission.Request, CancellationToken.None);
        await JsonSerializer.SerializeAsync(Console.OpenStandardOutput(), result, JsonOptions);
        return 0;
    }

    private sealed record Submission(string Slug, ExecuteBasicExerciseRequest Request);
}
