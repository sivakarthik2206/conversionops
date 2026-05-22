# ConversionOps — Manual Production Deploy Script
# Triggers GCP Cloud Build with the current commit
# Usage: .\infra\scripts\deploy.ps1 [-DryRun]

param(
    [string]$ProjectId = $env:GOOGLE_CLOUD_PROJECT,
    [string]$Region = "us-central1",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if (-not $ProjectId) {
    Write-Error "GOOGLE_CLOUD_PROJECT not set. Pass -ProjectId or set the env var."
    exit 1
}

$CommitSha = git rev-parse HEAD
$Branch = git branch --show-current

Write-Host "ConversionOps Manual Deploy" -ForegroundColor Cyan
Write-Host "  Project: $ProjectId" -ForegroundColor White
Write-Host "  Region:  $Region" -ForegroundColor White
Write-Host "  Commit:  $CommitSha" -ForegroundColor White
Write-Host "  Branch:  $Branch" -ForegroundColor White
Write-Host ""

if ($Branch -ne "main") {
    Write-Warning "You are not on main branch (current: $Branch). Are you sure?"
    $confirm = Read-Host "Type 'yes' to continue"
    if ($confirm -ne "yes") { exit 0 }
}

if ($DryRun) {
    Write-Host "[DRY RUN] Would trigger Cloud Build for commit $CommitSha" -ForegroundColor Cyan
    exit 0
}

Write-Host "Triggering Cloud Build..." -ForegroundColor Yellow
gcloud builds submit `
    --project=$ProjectId `
    --config=infra/gcp/cloudbuild.yaml `
    --substitutions=SHORT_SHA=$($CommitSha.Substring(0,7)),COMMIT_SHA=$CommitSha `
    .

Write-Host "Deploy complete." -ForegroundColor Green
