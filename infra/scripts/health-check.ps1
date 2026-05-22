# ConversionOps — Production Health Check Script
# Validates all critical services are responding
# Usage: .\infra\scripts\health-check.ps1 [-Env production|staging]

param(
    [string]$ApiUrl = "",
    [string]$ProjectId = $env:GOOGLE_CLOUD_PROJECT,
    [string]$Region = "us-central1"
)

$ErrorActionPreference = "SilentlyContinue"

if (-not $ApiUrl -and $ProjectId) {
    $ApiUrl = gcloud run services describe conversionops-api `
        --project=$ProjectId `
        --region=$Region `
        --format="value(status.url)" 2>$null
}

if (-not $ApiUrl) {
    $ApiUrl = "https://api.conversionops.in"
}

Write-Host "ConversionOps Health Check" -ForegroundColor Cyan
Write-Host "  API: $ApiUrl" -ForegroundColor White
Write-Host ""

$checks = @(
    @{ Name = "Liveness";  Url = "$ApiUrl/v1/health/live";  Expect = '"alive":true' },
    @{ Name = "Readiness"; Url = "$ApiUrl/v1/health/ready"; Expect = '"ready":true' },
    @{ Name = "Full Health"; Url = "$ApiUrl/v1/health"; Expect = '"status"' }
)

$allPassed = $true

foreach ($check in $checks) {
    try {
        $response = Invoke-WebRequest -Uri $check.Url -TimeoutSec 10 -UseBasicParsing 2>$null
        if ($response.StatusCode -eq 200 -and $response.Content -match $check.Expect) {
            Write-Host "  [PASS] $($check.Name)" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] $($check.Name) — HTTP $($response.StatusCode): $($response.Content)" -ForegroundColor Red
            $allPassed = $false
        }
    } catch {
        Write-Host "  [FAIL] $($check.Name) — $($_.Exception.Message)" -ForegroundColor Red
        $allPassed = $false
    }
}

Write-Host ""
if ($allPassed) {
    Write-Host "All checks passed." -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some checks FAILED. Investigate immediately." -ForegroundColor Red
    exit 1
}
