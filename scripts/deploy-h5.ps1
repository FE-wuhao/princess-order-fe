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
$distIndexPath = Join-Path $distDir "index.html"

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

function Get-IndexAssetUrls {
  param([string]$IndexPath)

  if (-not (Test-Path $IndexPath)) {
    throw "H5 index not found: $IndexPath"
  }

  $content = Get-Content -Raw $IndexPath
  $matches = [regex]::Matches($content, '(?:src|href)="(?<url>[^"]+\.(?:js|css))"')
  $urls = @()

  foreach ($match in $matches) {
    $urls += $match.Groups['url'].Value
  }

  return $urls | Select-Object -Unique
}

function Resolve-HealthTargetUrl {
  param(
    [string]$BaseUrl,
    [string]$RelativeOrAbsolutePath
  )

  if ($RelativeOrAbsolutePath -match '^https?://') {
    return $RelativeOrAbsolutePath
  }

  $trimmedBase = $BaseUrl.TrimEnd('/')
  $normalizedPath = if ($RelativeOrAbsolutePath.StartsWith('/')) {
    $RelativeOrAbsolutePath
  } else {
    "/$RelativeOrAbsolutePath"
  }

  return "$trimmedBase$normalizedPath"
}

function Invoke-HealthProbe {
  param(
    [string]$Url,
    [ValidateSet('html', 'asset')]
    [string]$Kind
  )

  $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 400) {
    throw "Unexpected status code $($response.StatusCode) for $Url"
  }

  $content = [string]$response.Content
  if ($Kind -eq 'html' -and $content -notmatch '<div id="app"></div>') {
    throw "HTML shell check failed for $Url"
  }

  if ($Kind -eq 'asset' -and [string]::IsNullOrWhiteSpace($content)) {
    throw "Asset response is empty for $Url"
  }
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
    $routesToCheck = @(
      $HealthUrl,
      (Resolve-HealthTargetUrl -BaseUrl $HealthUrl -RelativeOrAbsolutePath "/pages/index/index"),
      (Resolve-HealthTargetUrl -BaseUrl $HealthUrl -RelativeOrAbsolutePath "/pages/login/index")
    )
    $assetUrls = Get-IndexAssetUrls -IndexPath $distIndexPath

    $ok = $false
    $lastError = $null
    for ($i = 0; $i -lt 6; $i++) {
      try {
        foreach ($routeUrl in $routesToCheck) {
          Invoke-HealthProbe -Url $routeUrl -Kind 'html'
        }

        foreach ($assetUrl in $assetUrls) {
          $resolvedAssetUrl = Resolve-HealthTargetUrl -BaseUrl $HealthUrl -RelativeOrAbsolutePath $assetUrl
          Invoke-HealthProbe -Url $resolvedAssetUrl -Kind 'asset'
        }

        $ok = $true
        break
      } catch {
        $lastError = $_
        Start-Sleep -Seconds 3
      }
    }

    if (-not $ok) {
      Write-Warning "H5 health check failed after probing routes and assets. $lastError"
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
