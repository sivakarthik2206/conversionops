# ConversionOps — Secret Rotation Script
# Run from repo root with: .\infra\scripts\rotate-secrets.ps1 -SecretName <name>
#
# Prerequisites:
#   - gcloud CLI authenticated with sufficient IAM (roles/secretmanager.admin)
#   - PROJECT_ID env var set, or pass -ProjectId
#
# Usage:
#   .\rotate-secrets.ps1 -SecretName JWT_SECRET
#   .\rotate-secrets.ps1 -SecretName MAGIC_LINK_SECRET
#   .\rotate-secrets.ps1 -All   # rotate all rotatable secrets

param(
    [string]$SecretName = "",
    [string]$ProjectId = $env:GOOGLE_CLOUD_PROJECT,
    [switch]$All,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if (-not $ProjectId) {
    Write-Error "ProjectId is required. Set GOOGLE_CLOUD_PROJECT or pass -ProjectId."
    exit 1
}

function New-RandomSecret([int]$Length = 64) {
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    return [System.Convert]::ToBase64String($bytes).Substring(0, $Length)
}

function Rotate-Secret([string]$Name, [string]$Value) {
    Write-Host "Rotating $Name in project $ProjectId..." -ForegroundColor Yellow

    if ($DryRun) {
        Write-Host "  [DRY RUN] Would create new version of secret: $Name" -ForegroundColor Cyan
        return
    }

    # Add new version to Secret Manager
    $Value | gcloud secrets versions add $Name `
        --project=$ProjectId `
        --data-file=-

    Write-Host "  New version created for $Name" -ForegroundColor Green

    # List versions and disable old ones (keep latest 2 for rollback safety)
    $versions = gcloud secrets versions list $Name `
        --project=$ProjectId `
        --format="value(name)" `
        --filter="state=ENABLED" | Sort-Object -Descending

    $toDisable = $versions | Select-Object -Skip 2
    foreach ($v in $toDisable) {
        Write-Host "  Disabling old version: $v" -ForegroundColor Gray
        gcloud secrets versions disable $v `
            --secret=$Name `
            --project=$ProjectId `
            --quiet
    }
}

# Secrets that can be safely rotated (generates new random values)
$ROTATABLE_SECRETS = @("JWT_SECRET", "MAGIC_LINK_SECRET", "ADMIN_API_KEY")

if ($All) {
    Write-Host "Rotating all rotatable secrets: $($ROTATABLE_SECRETS -join ', ')" -ForegroundColor Cyan
    foreach ($secret in $ROTATABLE_SECRETS) {
        $newValue = New-RandomSecret -Length 64
        Rotate-Secret -Name $secret -Value $newValue
    }
    Write-Host ""
    Write-Host "IMPORTANT: After rotating JWT_SECRET, all existing JWT tokens are invalidated." -ForegroundColor Red
    Write-Host "Users will need to log in again. Coordinate this during low-traffic windows." -ForegroundColor Red
} elseif ($SecretName) {
    if ($ROTATABLE_SECRETS -contains $SecretName) {
        $newValue = New-RandomSecret -Length 64
        Rotate-Secret -Name $SecretName -Value $newValue
    } else {
        Write-Error "$SecretName is not in the auto-rotatable list. Rotate it manually in GCP Console."
        exit 1
    }
} else {
    Write-Host "Usage:" -ForegroundColor Cyan
    Write-Host "  .\rotate-secrets.ps1 -SecretName JWT_SECRET"
    Write-Host "  .\rotate-secrets.ps1 -All -DryRun"
    Write-Host ""
    Write-Host "Rotatable secrets: $($ROTATABLE_SECRETS -join ', ')"
}
