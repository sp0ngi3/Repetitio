$ErrorActionPreference = "Stop"

$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
$project = Join-Path $workspace "tools\Repetitio.Launcher\Repetitio.Launcher.csproj"
$sourceImage = Join-Path $workspace "src\frontend\repetitio-web\public\icon.ico"
$iconDirectory = Join-Path $workspace "tools\Repetitio.Launcher\Assets"
$iconPath = Join-Path $iconDirectory "repetitio.ico"
$publishDirectory = Join-Path $workspace "tools\Repetitio.Launcher\publish\win-x64"
$targetExecutable = Join-Path $workspace "00-REPETITIO.exe"

. (Join-Path $workspace "tools\LauncherIcon.ps1")

Write-Host "Building the Repetitio launcher..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $iconDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $publishDirectory -Force | Out-Null
Write-LauncherIcon -PngPath $sourceImage -DestinationPath $iconPath

dotnet publish $project `
    --configuration Release `
    --runtime win-x64 `
    --self-contained true `
    --output $publishDirectory `
    -p:PublishSingleFile=true `
    -p:IncludeNativeLibrariesForSelfExtract=true `
    -p:DebugType=None `
    -p:DebugSymbols=false

if ($LASTEXITCODE -ne 0) {
    throw "Launcher publishing failed with exit code $LASTEXITCODE."
}

$publishedExecutable = Join-Path $publishDirectory "Repetitio.exe"
Copy-Item -LiteralPath $publishedExecutable -Destination $targetExecutable -Force

Write-Host ""
Write-Host "Ready: $targetExecutable" -ForegroundColor Green
Write-Host "You can now double-click 00-REPETITIO.exe."
