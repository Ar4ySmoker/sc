# ============================================================
#  Открывает доступ к PostgreSQL для учеников по Wi-Fi
#  Запускать ОТ ИМЕНИ АДМИНИСТРАТОРА
# ============================================================
$ErrorActionPreference = 'Stop'

# 1. Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ОШИБКА: запусти PowerShell от имени администратора." -ForegroundColor Red
    exit 1
}

# 2. Найти каталог data службы postgresql-x64-16
$svc = Get-CimInstance Win32_Service -Filter "Name='postgresql-x64-16'" -ErrorAction SilentlyContinue
if (-not $svc) {
    Write-Host "ОШИБКА: служба postgresql-x64-16 не найдена." -ForegroundColor Red
    exit 1
}

$dataDir = "C:\Program Files\PostgreSQL\16\data"
if ($svc.PathName -match '-D\s+"?([^"]+)"?') {
    $dataDir = $Matches[1].Trim().Trim('"')
}
$hba = Join-Path $dataDir "pg_hba.conf"
Write-Host "pg_hba.conf: $hba"

# 3. Firewall (на случай, если ещё не открыт)
$fw = Get-NetFirewallRule -DisplayName "PostgreSQL 5432" -ErrorAction SilentlyContinue
if (-not $fw) {
    netsh advfirewall firewall add rule name="PostgreSQL 5432" dir=in action=allow protocol=TCP localport=5432 | Out-Null
    Write-Host "Firewall: правило добавлено." -ForegroundColor Green
} else {
    Write-Host "Firewall: правило уже есть." -ForegroundColor Yellow
}

# 4. Добавить правило в pg_hba.conf (если его ещё нет)
$content = Get-Content $hba -Raw
if ($content -match [regex]::Escape("0.0.0.0/0")) {
    Write-Host "pg_hba.conf: правило 0.0.0.0/0 уже есть — пропускаю." -ForegroundColor Yellow
} else {
    Add-Content -Path $hba -Value "`r`nhost    all             all             0.0.0.0/0            scram-sha-256"
    Write-Host "pg_hba.conf: правило 0.0.0.0/0 добавлено." -ForegroundColor Green
}

# 5. Перезапустить службу
Restart-Service postgresql-x64-16
Write-Host "Служба postgresql-x64-16 перезапущена." -ForegroundColor Green

Write-Host ""
Write-Host "Готово. Проверка с другого устройства: Test-NetConnection <IP> -Port 5432" -ForegroundColor Cyan
