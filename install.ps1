# Launchpad — Windows installer
# Usage: irm https://raw.githubusercontent.com/product-noob/launchpage-app/main/install.ps1 | iex
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repo = "product-noob/launchpage-app"

Write-Host "Fetching latest Launchpad release..."
$release = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest"
$tag = $release.tag_name

# Find the NSIS installer asset (.exe)
$asset = $release.assets | Where-Object { $_.name -like "*.exe" } | Select-Object -First 1
if (-not $asset) {
    Write-Error "No Windows installer found in release $tag. Make sure a release with a .exe asset exists."
    exit 1
}

$installerUrl = $asset.browser_download_url
$installerName = $asset.name
$tmpFile = Join-Path $env:TEMP $installerName

Write-Host "Downloading Launchpad $tag ($installerName)..."
Invoke-WebRequest -Uri $installerUrl -OutFile $tmpFile -UseBasicParsing

Write-Host "Running installer..."
# /S = silent install (NSIS standard flag)
$proc = Start-Process -FilePath $tmpFile -ArgumentList "/S" -PassThru -Wait
if ($proc.ExitCode -ne 0) {
    Write-Error "Installer exited with code $($proc.ExitCode)"
    Remove-Item $tmpFile -ErrorAction SilentlyContinue
    exit 1
}

Remove-Item $tmpFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Launchpad $tag installed. Find it in your Start Menu."
