# Integration check on a restored copy only. Does not change the application's database.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
Get-Content .env -Encoding UTF8 | ForEach-Object {
    if ($_ -cmatch '^([A-Z_]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1],$matches[2],'Process') }
}
$env:SPRING_DATASOURCE_URL='jdbc:postgresql://127.0.0.1:5433/budget_tracker_company_qa'
$env:SPRING_DATASOURCE_USERNAME='budget_dev'
$env:SPRING_CONFIG_LOCATION='classpath:/application-example.properties'
$env:SERVER_PORT='8081'
$java='C:\Program Files\Java\jdk-17\bin\java.exe'
if(!(Test-Path $java)){throw 'Java 17 bulunamadi.'}
$process = Start-Process -FilePath $java -ArgumentList @('-jar','target/budget-tracker-0.0.1-SNAPSHOT.jar') -WindowStyle Hidden -PassThru -RedirectStandardOutput 'target/migration-check.log' -RedirectStandardError 'target/migration-check-error.log'
$process.Id | Set-Content target/migration-check.pid
Write-Host 'Migration check started on port 8081.'
