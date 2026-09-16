$ErrorActionPreference = "Stop"

$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
$project = Join-Path $workspace "tools\Repetitio.Launcher\Repetitio.Launcher.csproj"
$sourceImage = Join-Path $workspace "src\frontend\repetitio-web\public\icon.ico"
$iconDirectory = Join-Path $workspace "tools\Repetitio.Launcher\Assets"
$iconPath = Join-Path $iconDirectory "repetitio.ico"
$publishDirectory = Join-Path $workspace "tools\Repetitio.Launcher\publish\win-x64"
$targetExecutable = Join-Path $workspace "00-REPETITIO.exe"

function Write-LauncherIcon {
    param(
        [Parameter(Mandatory = $true)][string]$PngPath,
        [Parameter(Mandatory = $true)][string]$DestinationPath
    )

    $png = [System.IO.File]::ReadAllBytes($PngPath)
    if ($png.Length -lt 24 -or $png[0] -ne 0x89 -or $png[1] -ne 0x50) {
        throw "The website icon is not a valid PNG file: $PngPath"
    }

    $width = [System.BitConverter]::ToInt32(@($png[19], $png[18], $png[17], $png[16]), 0)
    $height = [System.BitConverter]::ToInt32(@($png[23], $png[22], $png[21], $png[20]), 0)
    $iconWidth = if ($width -ge 256) { 0 } else { $width }
    $iconHeight = if ($height -ge 256) { 0 } else { $height }

    $stream = [System.IO.File]::Create($DestinationPath)
    try {
        $writer = [System.IO.BinaryWriter]::new($stream)
        $writer.Write([uint16]0)
        $writer.Write([uint16]1)
        $writer.Write([uint16]1)
        $writer.Write([byte]$iconWidth)
        $writer.Write([byte]$iconHeight)
        $writer.Write([byte]0)
        $writer.Write([byte]0)
        $writer.Write([uint16]1)
        $writer.Write([uint16]32)
        $writer.Write([uint32]$png.Length)
        $writer.Write([uint32]22)
        $writer.Write($png)
        $writer.Flush()
    }
    finally {
        $stream.Dispose()
    }
}

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
