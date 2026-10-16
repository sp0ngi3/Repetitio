function Get-InstalledWindowsVersion {
    $entries = @(Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue |
        Where-Object { $_.DisplayName -eq "Repetitio" -and $_.DisplayVersion -match '^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$' })
    return ($entries | Sort-Object { [version]($_.DisplayVersion -split '-')[0] } -Descending | Select-Object -First 1).DisplayVersion
}

function Get-WindowsBuildVersion {
    param([string]$Requested, [string]$SourceVersion, [string]$PreviousVersion)
    $pattern = '^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$'
    foreach ($value in @($Requested, $SourceVersion, $PreviousVersion)) {
        if ($value -and $value -notmatch $pattern) { throw "Invalid Windows version: $value" }
    }
    $previous = if ($PreviousVersion) { [version]($PreviousVersion -split '-')[0] } else { $null }
    if ($Requested) {
        if ($previous -and [version]($Requested -split '-')[0] -le $previous) { throw "Use a version newer than $PreviousVersion, or omit -Version to increase it automatically." }
        return $Requested
    }
    $source = [version]($SourceVersion -split '-')[0]
    if (!$previous -or $source -gt $previous) { return $SourceVersion }
    return "{0}.{1}.{2}" -f $previous.Major, $previous.Minor, ($previous.Build + 1)
}

function Install-WindowsBuild {
    param([string]$Directory, [string]$BuildId)
    $setup = Join-Path $Directory "Repetitio-Setup.exe"
    if (!(Test-Path -LiteralPath $setup)) { throw "The complete Setup EXE was not built. Nothing was installed." }
    Write-Host "Installing the new Windows version. Save any unfinished work if Repetitio asks you to close." -ForegroundColor Cyan
    $installer = Start-Process -FilePath $setup -ArgumentList "/currentuser" -PassThru
    $installer.WaitForExit()
    if ($installer.ExitCode -ne 0) { throw "Installation was cancelled or failed ($($installer.ExitCode)). Your database and backups were not removed." }
    $entries = @(Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -eq "Repetitio" })
    foreach ($entry in $entries) {
        if (!$entry.InstallLocation) { continue }
        $info = Join-Path $entry.InstallLocation "resources\runtime\build-info.json"
        if ((Test-Path -LiteralPath $info) -and ((Get-Content -LiteralPath $info -Raw | ConvertFrom-Json).id -eq $BuildId)) {
            Write-Host "Installed the latest build: $($entry.InstallLocation)" -ForegroundColor Green
            return
        }
    }
    throw "The installed build could not be confirmed. Run artifacts\Repetitio-Setup.exe and check Help > About Repetitio. Your data was not deleted."
}
