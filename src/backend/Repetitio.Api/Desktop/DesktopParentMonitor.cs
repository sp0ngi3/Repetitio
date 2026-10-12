using System.Diagnostics;

namespace Repetitio.Api.Desktop;

public sealed class DesktopParentMonitor(IConfiguration configuration, IHostApplicationLifetime lifetime) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!configuration.GetValue<bool>("Desktop:Enabled")) return;
        var parentId = configuration.GetValue<int>("Desktop:ParentProcessId");
        if (parentId <= 0) return;
        try
        {
            using var parent = Process.GetProcessById(parentId);
            await parent.WaitForExitAsync(stoppingToken);
            lifetime.StopApplication();
        }
        catch (ArgumentException) { lifetime.StopApplication(); }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }
}
