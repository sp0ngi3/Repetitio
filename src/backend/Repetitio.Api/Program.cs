using System.Text.Json.Serialization;
using Repetitio.Api.Endpoints;
using Repetitio.Api.Execution;
using Repetitio.Api.Execution.Harnesses;
using Repetitio.Domain.LearningItems;
using Repetitio.Domain.Notes;
using Repetitio.Domain.Practice;
using Repetitio.Infrastructure;
using Repetitio.Infrastructure.Persistence;
using Repetitio.Api.Desktop;

var desktopCommand = await DesktopRuntime.RunDataCommandAsync(args);
if (desktopCommand is not null) { Environment.ExitCode = desktopCommand.Value; return; }

var builder = WebApplication.CreateBuilder(args);
if (builder.Configuration.GetValue<bool>("Desktop:Enabled"))
{
    // This authenticated local desktop API accepts backups without an application size cap.
    builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = null);
    builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options => options.MultipartBodyLengthLimit = long.MaxValue);
}

builder.Services.AddOpenApi();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter<LearningDifficulty>());
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter<LearningItemStatus>());
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter<LearningItemType>());
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter<NoteArea>());
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter<PracticeOutcome>());
});
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "frontend",
        policy => policy
            .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
            .AllowAnyHeader()
            .AllowAnyMethod());
});
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddSingleton<BasicExerciseExecutionService>();
builder.Services.AddHostedService<DesktopParentMonitor>();
builder.Services.AddSingleton<IBasicExerciseHarness, ReverseLinkedListHarness>();

foreach (var harness in BasicExerciseHarnessCatalog.GetAll())
{
    builder.Services.AddSingleton<IBasicExerciseHarness>(harness);
}

var app = builder.Build();
DesktopRuntime.Configure(app);
if (builder.Configuration.GetValue<bool>("Desktop:Enabled"))
{
    var databasePath = new Microsoft.Data.Sqlite.SqliteConnectionStringBuilder(builder.Configuration.GetConnectionString("Repetitio")).DataSource;
    if (File.Exists(databasePath)) await DesktopRuntime.ValidateDatabaseAsync(databasePath);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("frontend");

await app.Services.ApplyDatabaseMigrationsAsync();

app.MapHealthEndpoints();
app.MapBasicExerciseEndpoints();
app.MapDsaEndpoints();
app.MapSystemDesignEndpoints();
app.MapFlashcardEndpoints();
app.MapNoteEndpoints();
app.MapWikiEndpoints();
app.MapWikiStudyEndpoints();
app.MapLearningItemEndpoints();
app.MapTagEndpoints();
app.MapPracticeSessionEndpoints();
app.MapReviewEndpoints();
app.MapDashboardEndpoints();
app.MapBackupEndpoints();

await app.RunAsync();
