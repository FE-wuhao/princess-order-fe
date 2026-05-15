[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$ServerAlias = "princess-ecs",
  [string]$RemoteDir = "/srv/princess-order-h5",
  [string]$HealthUrl = "https://princess-order.wuhao.space/"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$distDir = Join-Path $projectRoot "dist"
$archiveName = "princess-order-h5-{0}.tar.gz" -f ([guid]::NewGuid().ToString("N"))
$deployCacheDir = Join-Path $projectRoot ".deploy-cache"
$archivePath = Join-Path $deployCacheDir $archiveName
$remoteArchivePath = "/tmp/$archiveName"

$sshOptions = @(
  "-o", "BatchMode=yes",
  "-o", "ServerAliveInterval=15",
  "-o", "ServerAliveCountMax=20"
)

function Invoke-RemoteSsh {
  param([string]$RemoteCommand)
  & ssh.exe @sshOptions $ServerAlias $RemoteCommand
}

function Get-TarExecutable {
  $systemTar = Join-Path $env:SystemRoot "System32\tar.exe"
  if (Test-Path $systemTar) {
    return $systemTar
  }
  return "tar.exe"
}

try {
  if (-not (Test-Path $deployCacheDir)) {
    New-Item -ItemType Directory -Path $deployCacheDir | Out-Null
  }

  Write-Host "==> Build H5" -ForegroundColor Cyan
  if ($PSCmdlet.ShouldProcess($projectRoot, "yarn build:h5")) {
    Push-Location $projectRoot
    $env:NODE_ENV = "production"
    yarn build:h5
    Pop-Location
  }

  if (-not (Test-Path $distDir)) {
    throw "H5 dist not found: $distDir"
  }

  Write-Host "==> Pack dist" -ForegroundColor Cyan
  if ($PSCmdlet.ShouldProcess($archivePath, "Create archive")) {
    $tar = Get-TarExecutable
    Push-Location $distDir
    & $tar -czf $archivePath .
    Pop-Location
  }

  Write-Host "==> Upload" -ForegroundColor Cyan
  if ($PSCmdlet.ShouldProcess($ServerAlias, "scp archive")) {
    & scp.exe @sshOptions $archivePath "${ServerAlias}:$remoteArchivePath"
  }

  Write-Host "==> Deploy on server" -ForegroundColor Cyan
  $deployScript = @"
set -euo pipefail
sudo mkdir -p '$RemoteDir'
sudo tar -xzf '$remoteArchivePath' -C '$RemoteDir'
sudo rm -f '$remoteArchivePath'
"@

  if ($PSCmdlet.ShouldProcess($RemoteDir, "Extract archive")) {
    Invoke-RemoteSsh $deployScript
  }

  Write-Host "==> Health check $HealthUrl" -ForegroundColor Cyan
  if ($PSCmdlet.ShouldProcess($HealthUrl, "curl health")) {
    $ok = $false
    for ($i = 0; $i -lt 6; $i++) {
      try {
        $response = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
          $ok = $true
          break
        }
      } catch {
        Start-Sleep -Seconds 3
      }
    }

    if (-not $ok) {
      Write-Warning "H5 health check did not return 2xx. Verify nginx config: deploy/nginx-princess-order-h5.conf"
    } else {
      Write-Host "H5 deploy OK" -ForegroundColor Green
    }
  }
}
finally {
  if (Test-Path $archivePath) {
    Remove-Item $archivePath -Force
  }
}
