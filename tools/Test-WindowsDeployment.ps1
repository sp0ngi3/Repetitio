$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "WindowsDeployment.ps1")
$cases = @(
    @("", "0.2.0", "0.1.1", "0.2.0"),
    @("", "0.2.0", "0.2.0", "0.2.1"),
    @("", "0.2.0", "0.4.9", "0.4.10"),
    @("", "0.2.0", "", "0.2.0"),
    @("1.0.0", "0.2.0", "0.4.0", "1.0.0")
)
foreach ($case in $cases) {
    $actual = Get-WindowsBuildVersion -Requested $case[0] -SourceVersion $case[1] -PreviousVersion $case[2]
    if ($actual -ne $case[3]) { throw "Expected $($case[3]), received $actual" }
}
foreach ($invalid in @("0.1.0", "0.2.0", "not-a-version")) {
    $rejected = $false
    try { Get-WindowsBuildVersion -Requested $invalid -SourceVersion "0.2.0" -PreviousVersion "0.2.0" | Out-Null }
    catch { $rejected = $true }
    if (!$rejected) { throw "Unsafe or invalid version was accepted: $invalid" }
}
Write-Output "Windows deployment versioning: 8 checks passed."
