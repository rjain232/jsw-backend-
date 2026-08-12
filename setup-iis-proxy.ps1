param(
    [string]$SiteName = 'jsw-backend',
    [int]$Port = 8081,
    [int]$BackendPort = 8080
)

$ErrorActionPreference = 'Stop'

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this script from an elevated PowerShell window.'
}

$siteRoot = 'C:\inetpub\jsw-backend-proxy'
if (-not (Test-Path $siteRoot)) {
    New-Item -ItemType Directory -Path $siteRoot -Force | Out-Null
}

$webConfigContent = @'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxy" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll" />
          <action type="Rewrite" url="http://127.0.0.1:8080/{R:0}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
'@
Set-Content -Path (Join-Path $siteRoot 'web.config') -Value $webConfigContent -Encoding UTF8
Set-Content -Path (Join-Path $siteRoot 'index.html') -Value '<!doctype html><html><body><h1>JSW Backend Proxy</h1></body></html>' -Encoding UTF8

Import-Module WebAdministration -ErrorAction Stop
$poolName = "$SiteName-AppPool"
if (-not (Test-Path "IIS:\AppPools\$poolName")) {
    New-Item "IIS:\AppPools\$poolName" -Force | Out-Null
}
Set-ItemProperty "IIS:\AppPools\$poolName" -Name managedRuntimeVersion -Value ''
Set-ItemProperty "IIS:\AppPools\$poolName" -Name processModel.identityType -Value ApplicationPoolIdentity

if (Test-Path "IIS:\Sites\$SiteName") {
    Remove-Website -Name $SiteName -ErrorAction SilentlyContinue
}

New-Website -Name $SiteName -Port $Port -PhysicalPath $siteRoot -ApplicationPool $poolName | Out-Null
Start-Website -Name $SiteName

Write-Host "Proxy site '$SiteName' created and started."
Write-Host "Open: http://localhost:$Port/health"
