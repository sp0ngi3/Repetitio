using Repetitio.Infrastructure.Backup;

namespace Repetitio.Api.Backup;

internal sealed class DailyBackupWorker(IServiceScopeFactory scopeFactory, ILogger<DailyBackupWorker> logger) : BackgroundService
{
    private static readonly TimeSpan RetryDelay = TimeSpan.FromMinutes(15);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTimeOffset.UtcNow;
            var utcDay = DateOnly.FromDateTime(now.UtcDateTime);
            var nextRun = now.UtcDateTime.Date.AddDays(1);

            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var service = scope.ServiceProvider.GetRequiredService<IRepetitioBackupService>();
                if (await service.EnsureDailyBackupAsync(utcDay, stoppingToken))
                    logger.LogInformation("Daily SQLite backup created for {UtcDay:yyyy-MM-dd} UTC.", utcDay);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception error)
            {
                logger.LogError(error, "Daily SQLite backup failed. Retrying in {RetryMinutes} minutes.", RetryDelay.TotalMinutes);
                nextRun = DateTime.UtcNow + RetryDelay;
            }

            var delay = nextRun - DateTime.UtcNow;
            if (delay > TimeSpan.Zero)
                await Task.Delay(delay, stoppingToken);
        }
    }
}
