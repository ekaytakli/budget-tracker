$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
New-Item -ItemType Directory -Path 'backups' -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$file = "budget-$stamp.dump"
$containerFile = "/tmp/$file"
# Names come from the running container, so no password is printed or passed on the command line.
& docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$1"' -- $containerFile
if ($LASTEXITCODE -ne 0) { throw 'Veritabanı yedeklenemedi. Container hazır mı?' }
& docker compose cp "db:$containerFile" "backups/$file"
if ($LASTEXITCODE -ne 0) { throw 'Yedek Windows klasörüne kopyalanamadı.' }
& docker compose exec -T db rm -f $containerFile
if ($LASTEXITCODE -ne 0) { throw 'Geçici yedek dosyası temizlenemedi.' }
Write-Host "Yedek oluşturuldu: backups/$file"
