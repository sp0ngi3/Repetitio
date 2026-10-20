param(
    [string]$Version,
    [switch]$Offline,
    [switch]$UnpackedOnly,
    [switch]$Install
)
$ErrorActionPreference = "Stop"
$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = Join-Path $workspace "tools\Repetitio.Desktop"
$frontend = Join-Path $workspace "src\frontend\repetitio-web"
$lockDirectory = Join-Path $workspace ".artifacts\desktop"
New-Item -ItemType Directory -Path $lockDirectory -Force | Out-Null
try { $buildLock = [System.IO.File]::Open((Join-Path $lockDirectory "build.lock"), [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None) }
catch { throw "Another Windows build/update is running, or the build directory is not writable. Existing builds and data were not changed." }
try {
if ($Install -and $UnpackedOnly) { throw "Installation needs a full build. Do not combine -Install and -UnpackedOnly." }
. (Join-Path $workspace "tools\WindowsDeployment.ps1")
$package = Get-Content -LiteralPath (Join-Path $desktop "package.json") -Raw | ConvertFrom-Json
$previousManifest = Join-Path $workspace "artifacts\release.json"
$lastVersion = if (Test-Path -LiteralPath $previousManifest) { (Get-Content -LiteralPath $previousManifest -Raw | ConvertFrom-Json).version } else { $null }
$installedVersion = Get-InstalledWindowsVersion
if ($installedVersion -and (!$lastVersion -or [version]($installedVersion -split '-')[0] -gt [version]($lastVersion -split '-')[0])) { $lastVersion = $installedVersion }
$Version = Get-WindowsBuildVersion -Requested $Version -SourceVersion $package.version -PreviousVersion $lastVersion
$stamp = (Get-Date -Format "yyyyMMdd-HHmmss-fff") + "-" + [guid]::NewGuid().ToString("N").Substring(0, 6)
$stage = Join-Path $workspace ".artifacts\desktop\stage-$Version-$stamp"
$release = Join-Path $workspace ".artifacts\desktop\build-$Version-$stamp"
$output = Join-Path $workspace "artifacts"
$previousApi = $env:VITE_API_BASE_URL
$previousStage = $env:REPETITIO_DESKTOP_STAGE
$previousRelease = $env:REPETITIO_RELEASE_DIRECTORY
$previousVersion = $env:REPETITIO_VERSION
$previousFrontendVersion = $env:VITE_APP_VERSION
$previousBuildId = $env:VITE_BUILD_ID

function Invoke-Checked {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed ($LASTEXITCODE). Existing builds and data were not removed." }
}

function Assert-WorkspacePath {
    param([string]$Path)
    $full = [System.IO.Path]::GetFullPath($Path)
    $root = [System.IO.Path]::GetFullPath($workspace).TrimEnd('\') + '\'
    if (!$full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) { throw "Build output must stay inside the workspace: $full" }
    if ((Test-Path -LiteralPath $full) -and ((Get-Item -LiteralPath $full).Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
        throw "Build output cannot be a linked directory: $full"
    }
}

function Publish-Artifacts {
    Assert-WorkspacePath $release
    Assert-WorkspacePath $output
    $previous = Join-Path $workspace ".artifacts\desktop\previous-$stamp"
    Assert-WorkspacePath $previous
    if (Test-Path -LiteralPath $output) {
        if (!(Test-Path -LiteralPath (Join-Path $output "release.json"))) { throw "artifacts already exists and is not a recognized Windows build. Its files were left untouched." }
        Move-Item -LiteralPath $output -Destination $previous
    }
    try { Move-Item -LiteralPath $release -Destination $output }
    catch {
        if ((Test-Path -LiteralPath $previous) -and !(Test-Path -LiteralPath $output)) { Move-Item -LiteralPath $previous -Destination $output }
        throw
    }
}

function Copy-PrivateRuntime {
    $runtimeInfo = & dotnet --list-runtimes
    if ($LASTEXITCODE -ne 0) { throw "Install the .NET 10 SDK to build this package." }
    $core = @($runtimeInfo | ForEach-Object { if ($_ -match '^Microsoft\.NETCore\.App (10\.\d+\.\d+) \[(.+)\]$') { [PSCustomObject]@{ Version = [version]$Matches[1]; Directory = $Matches[2] } } } | Sort-Object Version -Descending)[0]
    $asp = @($runtimeInfo | ForEach-Object { if ($_ -match '^Microsoft\.AspNetCore\.App (10\.\d+\.\d+) \[(.+)\]$') { [PSCustomObject]@{ Version = [version]$Matches[1]; Directory = $Matches[2] } } } | Sort-Object Version -Descending)[0]
    if (!$core -or !$asp) { throw "The .NET 10 SDK with ASP.NET Core runtime is required on the build machine." }
    $root = Split-Path -Parent (Split-Path -Parent $core.Directory)
    $dotnet = Join-Path $stage "dotnet"
    New-Item -ItemType Directory -Path $dotnet -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $root "dotnet.exe") -Destination $dotnet
    foreach ($item in @(@("shared\Microsoft.NETCore.App", $core), @("shared\Microsoft.AspNetCore.App", $asp))) {
        $parent = Join-Path $dotnet $item[0]
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $item[1].Directory $item[1].Version.ToString()) -Destination $parent -Recurse
    }
    $fxrRoot = Join-Path $root "host\fxr"
    $fxr = Get-ChildItem -LiteralPath $fxrRoot -Directory | Where-Object { $_.Name -match '^10\.\d+\.\d+$' } | Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1
    if (!$fxr) { throw "The .NET 10 hostfxr runtime could not be located." }
    New-Item -ItemType Directory -Path (Join-Path $dotnet "host\fxr") -Force | Out-Null
    Copy-Item -LiteralPath $fxr.FullName -Destination (Join-Path $dotnet "host\fxr") -Recurse
    foreach ($file in @("LICENSE.txt", "ThirdPartyNotices.txt")) {
        if (Test-Path -LiteralPath (Join-Path $root $file)) { Copy-Item -LiteralPath (Join-Path $root $file) -Destination $dotnet }
    }
    return $core.Version.ToString()
}

try {
    New-Item -ItemType Directory -Path $stage, $release -Force | Out-Null
    Write-Host "Building Repetitio Windows $Version. Existing releases and databases stay untouched." -ForegroundColor Cyan
    foreach ($folder in @($frontend, $desktop)) {
        Push-Location $folder
        try {
            if ($Offline) {
                if (!(Test-Path -LiteralPath (Join-Path $folder "node_modules"))) { throw "Offline build needs dependencies from a previous online build: $folder" }
            } else { Invoke-Checked "npm.cmd" @("ci", "--prefer-offline", "--no-audit", "--no-fund") }
        } finally { Pop-Location }
    }
    if (!(Test-Path -LiteralPath (Join-Path $desktop "node_modules\electron\dist\electron.exe"))) {
        Push-Location $desktop
        try { Invoke-Checked "node" @("node_modules\electron\install.js") } finally { Pop-Location }
    }
    $env:VITE_API_BASE_URL = "repetitio://app"
    $env:VITE_APP_VERSION = $Version
    $env:VITE_BUILD_ID = $stamp
    Push-Location $frontend
    try { Invoke-Checked "npm.cmd" @("run", "build") } finally { Pop-Location }
    Copy-Item -LiteralPath (Join-Path $frontend "dist") -Destination (Join-Path $stage "frontend") -Recurse
    $project = Join-Path $workspace "src\backend\Repetitio.Api\Repetitio.Api.csproj"
    $restore = @("restore", $project, "--runtime", "win-x64", "-p:NuGetAudit=false", "--ignore-failed-sources")
    if ($Offline) {
        $feed = Join-Path $workspace ".artifacts\desktop\empty-nuget-feed"
        New-Item -ItemType Directory -Path $feed -Force | Out-Null
        $restore += @("--source", $feed)
    }
    Invoke-Checked "dotnet" $restore
    Invoke-Checked "dotnet" @("publish", $project, "--configuration", "Release", "--runtime", "win-x64", "--self-contained", "false", "--no-restore", "--output", (Join-Path $stage "api"), "-p:UseAppHost=false", "-p:DebugType=None", "-p:DebugSymbols=false")
    $runtimeVersion = Copy-PrivateRuntime
    $builtAt = (Get-Date).ToUniversalTime().ToString("o")
    $buildInfo = @{ version = $Version; id = $stamp; builtAt = $builtAt;
        frontendSha256 = (Get-FileHash -LiteralPath (Join-Path $stage "frontend\index.html") -Algorithm SHA256).Hash;
        apiSha256 = (Get-FileHash -LiteralPath (Join-Path $stage "api\Repetitio.Api.dll") -Algorithm SHA256).Hash }
    $buildInfo | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stage "build-info.json") -Encoding UTF8
    New-Item -ItemType Directory -Path (Join-Path $desktop "assets") -Force | Out-Null
    . (Join-Path $workspace "tools\LauncherIcon.ps1")
    Write-LauncherIcon -PngPath (Join-Path $frontend "public\icon.ico") -DestinationPath (Join-Path $desktop "assets\icon.ico")
    $env:REPETITIO_DESKTOP_STAGE = $stage
    $env:REPETITIO_RELEASE_DIRECTORY = $release
    $env:REPETITIO_VERSION = $Version
    Push-Location $desktop
    try {
        $arguments = @("node_modules\electron-builder\cli.js", "--config", "electron-builder.config.cjs", "--publish", "never", "--win", "--x64")
        if ($UnpackedOnly) { $arguments += "--dir" }
        Invoke-Checked "node" $arguments
    } finally { Pop-Location }
    $unpacked = Join-Path $release "win-unpacked"
    $windows = Join-Path $release "windows"
    Assert-WorkspacePath $unpacked
    Assert-WorkspacePath $windows
    Move-Item -LiteralPath $unpacked -Destination $windows
    $artifacts = @(Get-ChildItem -LiteralPath $release -Filter "*.exe" -File | ForEach-Object { @{ file = $_.Name; sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash } })
    @{ version = $Version; id = $stamp; builtAt = $builtAt; dotnetRuntime = $runtimeVersion; architecture = "win-x64"; artifacts = $artifacts } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $release "release.json") -Encoding UTF8
    Publish-Artifacts
    Write-Host "Ready: $output" -ForegroundColor Green
    if ($UnpackedOnly) { Write-Host "Run artifacts\windows\Repetitio.exe. Keep the complete windows folder together." }
    else { Write-Host "Run artifacts\Repetitio.exe or install/update with artifacts\Repetitio-Setup.exe. Data stays in LocalAppData\Repetitio." }
    if ($Install) { Install-WindowsBuild -Directory $output -BuildId $stamp }
} finally {
    $env:VITE_API_BASE_URL = $previousApi
    $env:REPETITIO_DESKTOP_STAGE = $previousStage
    $env:REPETITIO_RELEASE_DIRECTORY = $previousRelease
    $env:REPETITIO_VERSION = $previousVersion
    $env:VITE_APP_VERSION = $previousFrontendVersion
    $env:VITE_BUILD_ID = $previousBuildId
}
} finally { $buildLock.Dispose() }
