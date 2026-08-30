using Repetitio.Application.Basics;

namespace Repetitio.Api.Endpoints;

/// <summary>
/// Maps built-in Basics exercise API endpoints.
/// </summary>
public static class BasicExerciseEndpoints
{
    /// <summary>
    /// Adds Basics exercise endpoints to the application.
    /// </summary>
    /// <param name="app">The endpoint route builder.</param>
    /// <returns>The same endpoint route builder for chaining.</returns>
    public static IEndpointRouteBuilder MapBasicExerciseEndpoints(this IEndpointRouteBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);

        var group = app.MapGroup("/api/basics").WithTags("Basics");

        group.MapGet("/", () => Results.Ok(BasicExerciseCatalog.GetAll()))
            .WithName("GetBasicExercises");

        group.MapGet("/{slug}", (string slug) =>
        {
            var exercise = BasicExerciseCatalog.GetBySlug(slug);
            return exercise is null ? Results.NotFound() : Results.Ok(exercise);
        }).WithName("GetBasicExercise");

        return app;
    }
}
