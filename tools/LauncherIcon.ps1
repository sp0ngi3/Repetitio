function Write-LauncherIcon {
    param([Parameter(Mandatory = $true)][string]$PngPath, [Parameter(Mandatory = $true)][string]$DestinationPath)
    $png = [System.IO.File]::ReadAllBytes($PngPath)
    if ($png.Length -lt 24 -or $png[0] -ne 0x89 -or $png[1] -ne 0x50) { throw "The website icon is not a valid PNG file: $PngPath" }
    $width = [System.BitConverter]::ToInt32(@($png[19], $png[18], $png[17], $png[16]), 0)
    $height = [System.BitConverter]::ToInt32(@($png[23], $png[22], $png[21], $png[20]), 0)
    $stream = [System.IO.File]::Create($DestinationPath)
    try {
        $writer = [System.IO.BinaryWriter]::new($stream)
        $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]1)
        $writer.Write([byte]$(if ($width -ge 256) { 0 } else { $width }))
        $writer.Write([byte]$(if ($height -ge 256) { 0 } else { $height }))
        $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([uint16]1); $writer.Write([uint16]32)
        $writer.Write([uint32]$png.Length); $writer.Write([uint32]22); $writer.Write($png); $writer.Flush()
    } finally { $stream.Dispose() }
}
