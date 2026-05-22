# ConversionOps — Disaster Recovery Runbook

## Database Recovery

### Backup Strategy

Cloud SQL is configured with:
- **Automated daily backups** at 03:00 UTC (7-day retention)
- **Point-in-Time Recovery (PITR)** enabled — recover to any second in the last 7 days
- **Transaction logs** retained for 7 days

```bash
# List available backups
gcloud sql backups list --instance=conversionops-db --project=PROJECT_ID

# Restore to a specific backup (creates a new instance)
gcloud sql instances create conversionops-db-restore \
  --project=PROJECT_ID \
  --tier=db-g1-small \
  --region=us-central1 \
  --restore-backup-run-id=BACKUP_ID \
  --restore-instance=conversionops-db

# Point-in-Time Recovery (restore to a specific timestamp)
gcloud sql instances clone conversionops-db conversionops-db-restore \
  --point-in-time=2026-01-15T10:30:00.000Z \
  --project=PROJECT_ID
```

### Migration Rollback Safety

All Prisma migrations are **forward-only** — never drop columns in the same migration that removes them from the schema.

**Safe migration pattern:**
1. Add new column (nullable) → deploy → backfill → make non-null → deploy

**Rollback a bad migration:**
```bash
# Check which migration is causing issues
pnpm --filter @conversionops/db exec prisma migrate status

# Roll back by creating a new "down" migration
pnpm --filter @conversionops/db exec prisma migrate dev --name rollback_xyz
# Then edit the generated SQL to reverse the problematic change
```

---

## Redis Recovery

### Durability Assumptions

**Memorystore Standard (HA)** provides:
- Automatic failover to replica in < 1 minute
- RDB persistence snapshots every hour
- AOF persistence for granular replay

**What is lost on Redis failure:**
- BullMQ job data for jobs that were in-flight (between Redis write and ack)
- Typically < 30 seconds of job data due to automatic failover
- Idempotency keys (24hr TTL) — duplicate webhook processing may occur briefly

**Recovery behavior:**
- BullMQ reconnects automatically
- In-flight jobs that weren't acked are visible as "stalled" and retried
- Stalled job threshold: 30s (BullMQ default)

---

## Full Platform Recovery (nuclear scenario)

If the entire GCP project is lost:

```bash
# 1. Create new GCP project
# 2. Run bootstrap from docs/runbooks/deployment.md#first-time-production-bootstrap
# 3. Restore database from backup (point-in-time)
# 4. Update DATABASE_URL secret with new Cloud SQL connection string
# 5. Deploy latest Docker images
# 6. Run: pnpm --filter @conversionops/db exec prisma migrate deploy
# 7. Verify: .\infra\scripts\health-check.ps1

# RTO (Recovery Time Objective): ~2 hours
# RPO (Recovery Point Objective): ~1 hour (last Cloud SQL backup)
```

---

## Compliance Data Recovery

**Audit logs (7-year retention)** — never purged, stored in `AuditLog` table.
If DB is lost and restored from backup, audit logs are included in the restoration.

**CCPA deletion requests** — `piiDeletedAt` field marks anonymized records.
After restore, PII deletion status is preserved as of the backup point.

---

## Backup Verification (monthly)

Run monthly to verify backups are actually restorable:

```bash
# 1. Create a test restoration to a temporary instance
gcloud sql instances create conversionops-db-verify \
  --project=PROJECT_ID \
  --tier=db-f1-micro \
  --region=us-central1 \
  --restore-backup-run-id=$(gcloud sql backups list --instance=conversionops-db --project=PROJECT_ID --limit=1 --format="value(id)")
  --restore-instance=conversionops-db

# 2. Run a basic data integrity check
# Connect via proxy and run:
# SELECT count(*) FROM "Workspace";
# SELECT count(*) FROM "Lead";
# SELECT count(*) FROM "AuditLog";

# 3. Delete the verification instance
gcloud sql instances delete conversionops-db-verify --project=PROJECT_ID --quiet
```
