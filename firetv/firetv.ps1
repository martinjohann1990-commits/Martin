# Fire TV Stick 4K (2. Gen) – Debloat & Clean-Design per ADB (Windows PowerShell)
#
#   .\firetv.ps1 debloat  [-Ip 192.168.178.160] [-Optional] [-BlockUpdates] [-DryRun]
#   .\firetv.ps1 restore  [-Ip ...]
#   .\firetv.ps1 launcher -Apk C:\Pfad\launcher.apk
#   .\firetv.ps1 tweaks
param(
  [Parameter(Position=0)][ValidateSet('debloat','restore','launcher','tweaks')][string]$Mode = 'debloat',
  [string]$Ip = '192.168.178.160',
  [switch]$Optional, [switch]$BlockUpdates, [switch]$DryRun,
  [string]$Apk
)
$ErrorActionPreference = 'Continue'
Set-Location $PSScriptRoot
$Dev = "${Ip}:5555"
$Log = 'firetv-log.txt'

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb -and (Test-Path '.\platform-tools\adb.exe')) { $adb = (Resolve-Path '.\platform-tools\adb.exe').Path }
if (-not $adb) { Write-Error 'adb nicht gefunden. platform-tools in diesen Ordner entpacken (siehe README).'; exit 1 }

function Sh { param([string[]]$a) ((& $adb -s $Dev shell @a 2>&1) | Out-String).Trim() }

function Connect-FireTV {
  Write-Host ">> Verbinde mit $Dev ... (am TV ggf. 'USB-Debugging zulassen' bestaetigen)"
  & $adb connect $Dev | Out-Null
  for ($i=0; $i -lt 10; $i++) {
    if (((& $adb -s $Dev get-state 2>$null) | Out-String).Trim() -eq 'device') { break }
    Start-Sleep 2
  }
  if (((& $adb -s $Dev get-state 2>$null) | Out-String).Trim() -ne 'device') { Write-Error 'Keine Verbindung. ADB-Debugging aktiv? Dialog am TV bestaetigt?'; exit 1 }
  Write-Host ">> Verbunden: $(Sh getprop,ro.product.model), Fire OS $(Sh getprop,ro.build.version.name)"
}

function Read-List($f) { Get-Content $f | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') } }

function Get-Packages {
  $l = @(Read-List 'packages-safe.txt')
  if ($Optional)     { $l += Read-List 'packages-optional.txt' }
  if ($BlockUpdates) { $l += Read-List 'packages-updates.txt' }
  $l
}

switch ($Mode) {
  'debloat' {
    Connect-FireTV
    $installed = (Sh pm,list,packages) -split "`r?`n" | ForEach-Object { $_ -replace '^package:','' }
    Add-Content $Log "=== debloat $(Get-Date) ==="
    $ok=0; $skip=0; $fail=0
    foreach ($p in Get-Packages) {
      if ($installed -notcontains $p) { Write-Host "  -  $p (nicht vorhanden)"; $skip++; continue }
      if ($DryRun) { Write-Host "  ?  $p (wuerde deaktiviert)"; continue }
      $o = Sh pm,disable-user,--user,0,$p
      if ($o -match 'disabled') { Write-Host "  OK $p deaktiviert" -ForegroundColor Green; Add-Content $Log "disabled $p"; $ok++; continue }
      $o2 = Sh pm,uninstall,-k,--user,0,$p
      if ($o2 -match 'Success') { Write-Host "  OK $p fuer Benutzer entfernt" -ForegroundColor Green; Add-Content $Log "uninstalled $p"; $ok++ }
      else { Write-Host "  X  $p - von Fire OS blockiert ($o | $o2)" -ForegroundColor Yellow; Add-Content $Log "failed $p"; $fail++ }
    }
    Write-Host ">> Fertig: $ok entfernt, $skip nicht vorhanden, $fail blockiert. Log: $Log"
    Write-Host ">> Empfehlung: Fire TV neu starten ($adb -s $Dev reboot)."
  }
  'restore' {
    Connect-FireTV
    $Optional = $true; $BlockUpdates = $true
    foreach ($p in Get-Packages) { Sh cmd,package,install-existing,$p | Out-Null; Sh pm,enable,$p | Out-Null; Write-Host "  <- $p" }
    Write-Host '>> Wiederhergestellt. Bitte Fire TV neu starten.'
  }
  'tweaks' {
    Connect-FireTV
    foreach ($k in 'window_animation_scale','transition_animation_scale','animator_duration_scale') { Sh settings,put,global,$k,0.5 | Out-Null }
    Write-Host '>> Animationen auf 0.5x gesetzt. Rueckgaengig: Werte wieder auf 1 setzen.'
  }
  'launcher' {
    if (-not $Apk -or -not (Test-Path $Apk)) { Write-Error 'Pfad zur Launcher-APK mit -Apk angeben.'; exit 1 }
    Connect-FireTV
    & $adb -s $Dev install -r $Apk
    Write-Host '>> Installiert. Jetzt am TV den Launcher oeffnen und die Startseiten-Uebernahme einrichten (siehe README).'
  }
}
