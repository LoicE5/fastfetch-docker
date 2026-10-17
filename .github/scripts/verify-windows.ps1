param([Parameter(Mandatory = $true)][string]$Image)
$ErrorActionPreference = 'Stop'

function Invoke-CheckedDocker {
    param([string[]]$DockerArgs)
    $output = & docker @DockerArgs
    if ($LASTEXITCODE -ne 0) { throw "docker $DockerArgs failed ($LASTEXITCODE)" }
    return ($output -join "`n")
}

$metadata = @(Invoke-CheckedDocker -DockerArgs @('image', 'inspect', $Image) | ConvertFrom-Json)[0]
if ($metadata.Os -ne 'windows' -or $metadata.Architecture -ne 'amd64') {
    throw 'Expected a Windows AMD64 image'
}
$version = Invoke-CheckedDocker -DockerArgs @('run', '--rm', $Image, '--version')
if ($version -notmatch 'fastfetch\s+\d+\.') { throw 'Invalid Fastfetch version output' }
Write-Host $version
$default = Invoke-CheckedDocker -DockerArgs @('run', '--rm', $Image)
if ([string]::IsNullOrWhiteSpace($default)) { throw 'Default execution produced no output' }
$json = Invoke-CheckedDocker -DockerArgs @('run', '--rm', $Image, '--format', 'json', '--structure', 'OS')
$os = @($json | ConvertFrom-Json | Where-Object { $_.type -eq 'OS' })
if ($os.Count -ne 1 -or $os[0].error -or -not $os[0].result) {
    throw "OS detection failed: $json"
}
if ($os[0].result.name -notmatch 'Windows' -and $os[0].result.prettyName -notmatch 'Windows') {
    throw "Unexpected OS identity: $json"
}
Write-Host "Passed windows/amd64: $($os[0].result.prettyName)"
