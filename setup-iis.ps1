param(
    [string]$SiteName = 'jsw-backend',
    [int]$Port = 8081
)

$ErrorActionPreference = 'Stop'

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this script from an elevated PowerShell window.'
}

$siteRoot = 'C:\inetpub\jsw-backend'

try {
    Import-Module WebAdministration -ErrorAction Stop
} catch {
    throw 'IIS PowerShell support is not available. Install IIS before running this script.'
}

$appcmd = Join-Path $env:SystemRoot 'System32\inetsrv\appcmd.exe'
if (Test-Path $appcmd) {
    & $appcmd unlock config -section:system.webServer/handlers | Out-Null
    & $appcmd unlock config -section:system.webServer/iisnode | Out-Null
    & $appcmd set config -section:system.webServer/handlers /overrideModeDefault:Allow | Out-Null
}

if (-not (Test-Path $siteRoot)) {
    New-Item -ItemType Directory -Path $siteRoot -Force | Out-Null
}

Copy-Item -Path (Join-Path $PSScriptRoot '*') -Destination $siteRoot -Recurse -Force

$webConfigContent = @'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="src/index.js" verb="*" modules="iisnode" />
    </handlers>
    <rewrite>
      <rules>
        <rule name="iisnode" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
          </conditions>
          <action type="Rewrite" url="src/index.js" />
        </rule>
      </rules>
    </rewrite>
    <iisnode nodeProcessCommandLine="node src/index.js" loggingEnabled="true" maxLogFileSizeInKB="25000" />
  </system.webServer>
</configuration>
'@
Set-Content -Path (Join-Path $siteRoot 'web.config') -Value $webConfigContent -Encoding UTF8

$poolName = "$SiteName-AppPool"

if (-not (Test-Path "IIS:\AppPools\$poolName")) {
    New-Item "IIS:\AppPools\$poolName" -Force | Out-Null
}

Set-ItemProperty "IIS:\AppPools\$poolName" -Name managedRuntimeVersion -Value ''
Set-ItemProperty "IIS:\AppPools\$poolName" -Name processModel.identityType -Value ApplicationPoolIdentity

$poolIdentity = "IIS APPPOOL\$poolName"
$aclRule = "$poolIdentity`:(OI)(CI)RX"

if (-not (Test-Path $siteRoot)) {
    New-Item -ItemType Directory -Path $siteRoot -Force | Out-Null
}

icacls $siteRoot /grant $aclRule | Out-Null
if (Test-Path (Join-Path $siteRoot 'src')) {
    icacls (Join-Path $siteRoot 'src') /grant $aclRule | Out-Null
}

if (Test-Path "IIS:\Sites\$SiteName") {
    Remove-Website -Name $SiteName -ErrorAction SilentlyContinue
}

New-Website -Name $SiteName -Port $Port -PhysicalPath $siteRoot -ApplicationPool $poolName | Out-Null

try {
    Start-Website -Name $SiteName
    Write-Host "IIS site '$SiteName' created and started successfully."
} catch {
    Write-Warning "IIS site was created but could not be started. The IIS service may be unavailable or misconfigured."
    Write-Warning $_.Exception.Message
    Write-Host "You can still inspect the site with: Get-Website -Name '$SiteName'"
}

Write-Host "Open: http://localhost:$Port/health"
