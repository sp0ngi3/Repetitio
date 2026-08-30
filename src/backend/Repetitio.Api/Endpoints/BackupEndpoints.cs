using Repetitio.Application.Backup;
using Repetitio.Infrastructure.Backup;

namespace Repetitio.Api.Endpoints;

/// <summary>
/// Maps backup export, import, and validation API endpoints.
/// </summary>
public static class BackupEndpoints
{
    /// <summary>
    /// Adds backup endpoints to the application.
    /// </summary>
    /// <param name="app">The endpoint route builder.</param>
    /// <returns>The same endpoint route builder for chaining.</returns>
    public static IEndpointRouteBuilder MapBackupEndpoints(this IEndpointRouteBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);

        var group = app.MapGroup("/api/backup").WithTags("Backup");

        group.MapGet("/status", GetStatusAsync).WithName("GetBackupStatus");
        group.MapGet("/export", ExportAsync).WithName("ExportBackup");
        group.MapPost("/validate", ValidateAsync).WithName("ValidateBackup").DisableAntiforgery();
        group.MapPost("/import", ImportAsync).WithName("ImportBackup").DisableAntiforgery();

        return app;
    }

    /// <summary>
    /// Returns backup system status.
    /// </summary>
    /// <param name="backupService">The backup service.</param>
    /// <param name="cancellationToken">A token used to cancel the request.</param>
    /// <returns>The backup status response.</returns>
    private static async Task<IResult> GetStatusAsync(
        IRepetitioBackupService backupService,
        CancellationToken cancellationToken)
    {
        var status = await backupService.GetStatusAsync(cancellationToken);

        return Results.Ok(new BackupStatusResponse
        {
            DatabasePath = status.DatabasePath,
            DatabaseExists = status.DatabaseExists,
            BackupDirectory = status.BackupDirectory,
            DatabaseSchemaVersion = status.DatabaseSchemaVersion
        });
    }

    /// <summary>
    /// Exports the current SQLite database as a validated backup archive.
    /// </summary>
    /// <param name="backupService">The backup service.</param>
    /// <param name="cancellationToken">A token used to cancel the request.</param>
    /// <returns>The zip archive file response.</returns>
    private static async Task<IResult> ExportAsync(
        IRepetitioBackupService backupService,
        CancellationToken cancellationToken)
    {
        var backup = await backupService.ExportAsync(cancellationToken);

        return Results.File(backup.Contents, "application/zip", backup.FileName);
    }

    /// <summary>
    /// Validates an uploaded backup archive without importing it.
    /// </summary>
    /// <param name="file">The uploaded backup file.</param>
    /// <param name="backupService">The backup service.</param>
    /// <param name="cancellationToken">A token used to cancel the request.</param>
    /// <returns>The validation response.</returns>
    private static async Task<IResult> ValidateAsync(
        IFormFile file,
        IRepetitioBackupService backupService,
        CancellationToken cancellationToken)
    {
        if (!HasFile(file))
        {
            return Results.BadRequest("Backup file is required.");
        }

        await using var stream = file.OpenReadStream();
        var validation = await backupService.ValidateAsync(stream, cancellationToken);

        return validation.IsValid
            ? Results.Ok(ToValidationResponse(validation))
            : Results.BadRequest(ToValidationResponse(validation));
    }

    /// <summary>
    /// Imports an uploaded backup archive after validation.
    /// </summary>
    /// <param name="file">The uploaded backup file.</param>
    /// <param name="backupService">The backup service.</param>
    /// <param name="cancellationToken">A token used to cancel the request.</param>
    /// <returns>The import response.</returns>
    private static async Task<IResult> ImportAsync(
        IFormFile file,
        IRepetitioBackupService backupService,
        CancellationToken cancellationToken)
    {
        if (!HasFile(file))
        {
            return Results.BadRequest("Backup file is required.");
        }

        await using var stream = file.OpenReadStream();
        var import = await backupService.ImportAsync(stream, cancellationToken);
        var response = new ImportBackupResponse
        {
            Imported = import.Imported,
            Message = import.Message,
            PreImportBackupFileName = import.PreImportBackupFileName,
            Validation = ToValidationResponse(import.Validation)
        };

        return import.Imported ? Results.Ok(response) : Results.BadRequest(response);
    }

    /// <summary>
    /// Returns whether an uploaded file is present.
    /// </summary>
    /// <param name="file">The uploaded file.</param>
    /// <returns><see langword="true"/> when a non-empty file was uploaded; otherwise, <see langword="false"/>.</returns>
    private static bool HasFile(IFormFile? file)
    {
        return file is { Length: > 0 };
    }

    /// <summary>
    /// Converts an infrastructure validation result to an API response.
    /// </summary>
    /// <param name="validation">The validation result.</param>
    /// <returns>The validation response.</returns>
    private static BackupValidationResponse ToValidationResponse(BackupValidationResult validation)
    {
        return new BackupValidationResponse
        {
            IsValid = validation.IsValid,
            Message = validation.Message,
            Manifest = validation.Manifest is null
                ? null
                : new BackupManifestResponse
                {
                    Application = validation.Manifest.Application,
                    SchemaVersion = validation.Manifest.SchemaVersion,
                    CreatedAt = validation.Manifest.CreatedAt,
                    DatabaseSchemaVersion = validation.Manifest.DatabaseSchemaVersion
                }
        };
    }
}
