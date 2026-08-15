$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$jobs = @()

try {
  & npx.cmd supabase db query --linked --file (Join-Path $PSScriptRoot 'concurrency_setup.sql')
  if ($LASTEXITCODE -ne 0) { throw 'Concurrency test setup failed.' }

  $jobs = @(
    Start-Job -ScriptBlock {
      param($root, $file)
      Set-Location $root
      $output = & npx.cmd supabase db query --linked --file $file 2>&1 | Out-String
      [pscustomobject]@{ ExitCode = $LASTEXITCODE; Output = $output }
    } -ArgumentList $projectRoot, (Join-Path $PSScriptRoot 'concurrency_a.sql')
    Start-Job -ScriptBlock {
      param($root, $file)
      Set-Location $root
      $output = & npx.cmd supabase db query --linked --file $file 2>&1 | Out-String
      [pscustomobject]@{ ExitCode = $LASTEXITCODE; Output = $output }
    } -ArgumentList $projectRoot, (Join-Path $PSScriptRoot 'concurrency_b.sql')
  )

  $jobs | Wait-Job | Out-Null
  $results = @($jobs | Receive-Job)
  $results | ForEach-Object { $_.Output.Trim() }

  if (@($results | Where-Object ExitCode -eq 0).Count -ne 1) {
    throw 'Exactly one concurrent withdrawal request should succeed.'
  }

  & npx.cmd supabase db query --linked --file (Join-Path $PSScriptRoot 'concurrency_assert.sql')
  if ($LASTEXITCODE -ne 0) { throw 'Concurrency assertions failed.' }
}
finally {
  if ($jobs.Count -gt 0) { $jobs | Remove-Job -Force -ErrorAction SilentlyContinue }
  & npx.cmd supabase db query --linked --file (Join-Path $PSScriptRoot 'concurrency_cleanup.sql')
}
