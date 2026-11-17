param(
    [Parameter(Mandatory=$true)][string]$BackupFile,
    [Parameter(Mandatory=$true)][ValidatePattern('^[a-z][a-z0-9_]{2,60}$')][string]$NewDatabase
)
$ErrorActionPreference = 'Stop'
if($NewDatabase -cnotmatch '^[a-z][a-z0-9_]{0,62}$') { throw 'Veritabanı adı küçük harf, rakam ve alt çizgiden oluşmalıdır.' }
Set-Location (Split-Path $PSScriptRoot -Parent)
$resolvedBackup = (Resolve-Path -LiteralPath $BackupFile).Path
if (!(Test-Path -LiteralPath $resolvedBackup -PathType Leaf)) { throw 'Yedek dosyası bulunamadı.' }
$containerFile = '/tmp/budget-restore-' + [guid]::NewGuid().ToString('N') + '.dump'
# Never overwrite an existing database: createdb must succeed before the restore starts.
& docker compose exec -T db sh -c 'createdb -U "$POSTGRES_USER" "$1"' -- $NewDatabase
if ($LASTEXITCODE -ne 0) { throw 'Yeni veritabanı oluşturulamadı. Mevcut veritabanının üzerine yazılmaz.' }
try {
    & docker compose cp $resolvedBackup "db:$containerFile"
    if ($LASTEXITCODE -ne 0) { throw 'Yedek kopyalanamadı.' }
    & docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$1" --no-owner --exit-on-error "$2"' -- $NewDatabase $containerFile
    if ($LASTEXITCODE -ne 0) { throw 'Geri yükleme tamamlanamadı. Yeni veritabanını kontrol edin; asıl veritabanı değişmedi.' }
    Write-Host "Yedek ayrı veritabanına yüklendi: $NewDatabase"
} finally {
    & docker compose exec -T db rm -f $containerFile
}
