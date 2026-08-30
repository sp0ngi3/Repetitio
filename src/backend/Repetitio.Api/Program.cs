using System.Text.Json.Serialization;
using Repetitio.Api.Endpoints;
using Repetitio.Api.Execution;
using Repetitio.Api.Execution.Harnesses;
using Repetitio.Domain.LearningItems;
using Repetitio.Domain.Practice;
using Repetitio.Infrastructure;
using Repetitio.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter<LearningDifficulty>());
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter<LearningItemStatus>());
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter<LearningItemType>());
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
builder.Services.AddSingleton<IBasicExerciseHarness, ReverseLinkedListHarness>();

foreach (var harness in BasicExerciseHarnessCatalog.GetAll())
{
    builder.Services.AddSingleton<IBasicExerciseHarness>(harness);
}

var app = builder.Build();

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
app.MapLearningItemEndpoints();
app.MapTagEndpoints();
app.MapPracticeSessionEndpoints();
app.MapReviewEndpoints();
app.MapDashboardEndpoints();
app.MapBackupEndpoints();

await app.RunAsync();
