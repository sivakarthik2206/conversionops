# ConversionOps — Production Rollback Script
# Rolls back API and/or Worker to a previous Cloud Run revision
# Usage: .\infra\scripts\rollback.ps1 [-Service api|worker|all] [-Steps 1]

param(
    [ValidateSet("api", "worker", "all")]
    [string]$Service = "all",
    [int]$Steps = 1,
    [string]$ProjectId = $env:GOOGLE_CLOUD_PROJECT,
    [string]$Region = "us-central1",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if (-not $ProjectId) {
    Write-Error "GOOGLE_CLOUD_PROJECT not set."
    exit 1
}

function Rollback-Service([string]$ServiceName) {
    Write-Host "Rolling back $ServiceName by $Steps step(s)..." -ForegroundColor Yellow

    $revisions = gcloud run revisions list `
        --service=$ServiceName `
        --project=$ProjectId `
        --region=$Region `
        --format="value(name)" `
        --sort-by="~metadata.creationTimestamp" `
        --limit=($Steps + 2)

    $revList = @($revisions)

    if ($revList.Count -lt ($Steps + 1)) {
        Write-Error "Not enough revisions to roll back $Steps step(s). Found: $($revList.Count)"
        exit 1
    }

    $targetRevision = $revList[$Steps]

    Write-Host "  Current: $($revList[0])" -ForegroundColor White
    Write-Host "  Target:  $targetRevision" -ForegroundColor Cyan

    if ($DryRun) {
        Write-Host "  [DRY RUN] Would update traffic to $targetRevision=100" -ForegroundColor Cyan
        return
    }

    gcloud run services update-traffic $ServiceName `
        --project=$ProjectId `
        --region=$Region `
        --to-revisions="$targetRevision=100"

    Write-Host "  $ServiceName rolled back to $targetRevision" -ForegroundColor Green
}

Write-Host "ConversionOps Rollback" -ForegroundColor Red
Write-Host "  Project: $ProjectId, Region: $Region" -ForegroundColor White
Write-Host ""

switch ($Service) {
    "api"    { Rollback-Service "conversionops-api" }
    "worker" { Rollback-Service "conversionops-worker" }
    "all" {
        Rollback-Service "conversionops-api"
        Rollback-Service "conversionops-worker"
    }
}

Write-Host ""
Write-Host "Rollback complete. Verify health at:" -ForegroundColor Green
$apiUrl = gcloud run services describe conversionops-api `
    --project=$ProjectId `
    --region=$Region `
    --format="value(status.url)" 2>$null
Write-Host "  $apiUrl/v1/health" -ForegroundColor Cyan
