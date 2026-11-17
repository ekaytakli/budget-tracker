$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (!(Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
$path = Join-Path (Get-Location).Path '.env'
$content = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
foreach ($name in @('SPRING_DATASOURCE_PASSWORD','JWT_SECRET')) {
    $pattern = '(?m)^' + [regex]::Escape($name) + '=(.*)$'
    $match = [regex]::Match($content, $pattern)
    if ($match.Success -and $match.Groups[1].Value.Trim()) { continue }
    $bytes = New-Object byte[] 48
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $line = $name + '=' + [Convert]::ToBase64String($bytes)
    if ($match.Success) { $content = [regex]::Replace($content, $pattern, $line) }
    else { $content += "`n$line`n" }
}
[IO.File]::WriteAllText($path, $content, (New-Object Text.UTF8Encoding($false)))
Write-Host 'Local .env is ready. Existing credentials were preserved; no secret values were printed.'
