$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (!(Test-Path -LiteralPath '.env')) { throw 'Önce .env.example dosyasını .env olarak kopyalayıp veritabanı parolasını doldurun.' }

# Load simple KEY=value entries without evaluating their contents as PowerShell.
Get-Content -LiteralPath '.env' -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if ($line -and !$line.StartsWith('#')) {
        $pair = $line -split '=', 2
        if ($pair.Count -ne 2 -or $pair[0] -cnotmatch '^[A-Z_][A-Z0-9_]*$') { throw 'Geçersiz .env satırı.' }
        [Environment]::SetEnvironmentVariable($pair[0], $pair[1], 'Process')
    }
}
if (!$env:JWT_SECRET) {
    $bytes = New-Object byte[] 48
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    $env:JWT_SECRET = [Convert]::ToBase64String($bytes)
    Add-Content -LiteralPath '.env' -Value "`nJWT_SECRET=$env:JWT_SECRET" -Encoding UTF8
}
if (!(Test-Path -LiteralPath 'src/main/resources/application.properties')) {
    Copy-Item -LiteralPath 'src/main/resources/application-example.properties' -Destination 'src/main/resources/application.properties'
}
& docker compose up -d --wait --wait-timeout 60 db
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL başlatılamadı.' }
# Take a recoverable backup before any schema migration.
& (Join-Path $PSScriptRoot 'Backup-Database.ps1')
$jdk17 = 'C:\Program Files\Java\jdk-17'
if (Test-Path -LiteralPath $jdk17) { $env:JAVA_HOME = $jdk17; $env:Path = "$jdk17\bin;$env:Path" }
& .\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=docker'
if ($LASTEXITCODE -ne 0) { throw 'Backend başlatılamadı.' }
