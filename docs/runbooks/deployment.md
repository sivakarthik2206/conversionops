# ConversionOps — Deployment Runbook

## Normal Deploy (main branch push)

Deployments are fully automated via GCP Cloud Build.

**Pipeline:** `push to main` → Cloud Build trigger →
`install → type-check → lint → test → build images → push to Artifact Registry → migrate → deploy API → smoke test → deploy Worker`

**Monitor:** https://console.cloud.google.com/cloud-build/builds?project=PROJECT_ID

---

## Manual Deploy

```powershell
# From repo root, on main branch
.\infra\scripts\deploy.ps1

# Dry run (see what would happen)
.\infra\scripts\deploy.ps1 -DryRun
```

---

## Deploy Checklist

Before any production deploy:

```
[ ] pnpm run type-check        (zero errors)
[ ] pnpm run lint              (zero errors)
[ ] pnpm run test              (all pass)
[ ] pnpm run test:isolation    (all 8 isolation tests pass)
[ ] Check Prisma migrations: pnpm --filter @conversionops/db exec prisma migrate status
[ ] Review diff for new env vars — add to Secret Manager + cloud-run-*.yaml
[ ] If JWT_SECRET rotating: warn users about session invalidation
```

---

## First-Time Production Bootstrap

```powershell
# 1. Create GCP project and enable APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  --project=PROJECT_ID

# 2. Create Artifact Registry repo
gcloud artifacts repositories create conversionops \
  --repository-format=docker \
  --location=us-central1 \
  --project=PROJECT_ID

# 3. Create Cloud SQL (PostgreSQL 16)
gcloud sql instances create conversionops-db \
  --database-version=POSTGRES_16 \
  --tier=db-g1-small \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --backup-start-time=03:00 \
  --enable-point-in-time-recovery \
  --project=PROJECT_ID

gcloud sql databases create conversionops --instance=conversionops-db --project=PROJECT_ID
gcloud sql users create conversionops --instance=conversionops-db --password=STRONG_PASSWORD --project=PROJECT_ID

# 4. Create Redis (Memorystore)
gcloud redis instances create conversionops-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --tier=STANDARD_HA \
  --project=PROJECT_ID

# 5. Create service account
gcloud iam service-accounts create conversionops-runner \
  --project=PROJECT_ID

# Grant roles
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:conversionops-runner@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:conversionops-runner@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:conversionops-runner@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# 6. Create all secrets (replace values)
$secrets = @{
    "DATABASE_URL"          = "postgresql://conversionops:PASSWORD@/conversionops?host=/cloudsql/PROJECT_ID:us-central1:conversionops-db"
    "REDIS_URL"             = "redis://MEMORYSTORE_IP:6379"
    "JWT_SECRET"            = (.\infra\scripts\rotate-secrets.ps1 -DryRun; [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64)))
    "MAGIC_LINK_SECRET"     = (New-Object byte[] 64 | ForEach-Object { [System.Security.Cryptography.RandomNumberGenerator]::GetBytes($_) }; "GENERATE_MANUALLY")
    "TWILIO_ACCOUNT_SID"    = "ACxxxxxxxx"
    "TWILIO_AUTH_TOKEN"     = "your_auth_token"
    "TWILIO_PHONE_NUMBER"   = "+1XXXXXXXXXX"
    "STRIPE_SECRET_KEY"     = "sk_live_..."
    "STRIPE_WEBHOOK_SECRET" = "whsec_..."
    "RESEND_API_KEY"        = "re_..."
    "ADMIN_API_KEY"         = "GENERATE_64_CHAR_RANDOM"
    "CALCOM_WEBHOOK_SECRET" = "your_calcom_secret"
    "CALCOM_API_KEY"        = "your_calcom_api_key"
    "FUB_API_KEY"           = "your_fub_key"
}

foreach ($key in $secrets.Keys) {
    Write-Host "Creating secret: $key"
    # gcloud secrets create $key --project=PROJECT_ID
    # echo $secrets[$key] | gcloud secrets versions add $key --data-file=- --project=PROJECT_ID
}

# 7. Replace PROJECT_ID in infra/gcp/*.yaml then deploy
gcloud run services replace infra/gcp/cloud-run-api.yaml --region=us-central1
gcloud run services replace infra/gcp/cloud-run-worker.yaml --region=us-central1

# 8. Run first migration
.\infra\scripts\deploy.ps1

# 9. Seed production workspace
# (via admin endpoint or direct DB — requires admin token)
```

---

## Rollback Procedure

```powershell
# Rollback both services by 1 revision
.\infra\scripts\rollback.ps1 -Service all

# Rollback only API
.\infra\scripts\rollback.ps1 -Service api

# Rollback to a specific named revision
gcloud run services update-traffic conversionops-api \
  --region=us-central1 \
  --to-revisions=conversionops-api-abc1234=100

# Verify
.\infra\scripts\health-check.ps1
```

---

## Zero-Downtime Deploy Notes

- Cloud Run performs rolling deploys by default — new revision gets 100% traffic once startup probe passes
- The `startupProbe` allows 60s (12 attempts × 5s) for the API to become ready before traffic shifts
- Worker drain: BullMQ `closeTimeout: 30s` — in-flight jobs finish before container exit
- Migrations run BEFORE API deploy — ensure all migrations are backward-compatible (no column renames in one migration)
