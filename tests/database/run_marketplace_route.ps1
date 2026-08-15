param([string]$BaseUrl = 'http://localhost:3000')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$setup = Join-Path $PSScriptRoot 'marketplace_route_setup.sql'
$cleanup = Join-Path $PSScriptRoot 'marketplace_route_cleanup.sql'

try {
  Set-Location $root
  & npx.cmd supabase db query --linked --file $setup
  if ($LASTEXITCODE -ne 0) { throw 'Marketplace route setup failed.' }

  $url = "$($BaseUrl.TrimEnd('/'))/marketplace/99999999-9999-4999-8999-999999999998"
  $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 30
  if ($response.StatusCode -ne 200) { throw "Marketplace route returned $($response.StatusCode)." }
  if ($response.Content -notlike '*QA live marketplace listing*') {
    throw 'Marketplace route did not render the linked-project listing.'
  }
  [pscustomobject]@{ Status = 'passed'; Url = $url; StatusCode = $response.StatusCode }
}
finally {
  Set-Location $root
  & npx.cmd supabase db query --linked --file $cleanup
}
