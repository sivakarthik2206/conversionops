# ConversionOps — Production Launch Checklist

## Pre-Launch (run 24 hours before first customer)

### Infrastructure
- [ ] GCP project created, billing enabled, budget alert set at $200/month
- [ ] All GCP APIs enabled (Cloud Run, Cloud Build, SQL, Redis, Secret Manager, Vertex AI)
- [ ] Cloud SQL instance created: db-g1-small, backups enabled, PITR enabled
- [ ] Memorystore created: Standard HA tier, 1GB
- [ ] Service account created with correct IAM bindings
- [ ] All 14 secrets created in Secret Manager (see `.env.production`)

### Secrets Validation
- [ ] `node infra/scripts/validate-env.mjs` exits 0
- [ ] JWT_SECRET and MAGIC_LINK_SECRET are different, both >= 64 chars
- [ ] Stripe is using live keys (`sk_live_...`), not test keys
- [ ] Twilio number is provisioned and SMS-enabled
- [ ] Twilio webhook URL configured: `https://api.conversionops.in/v1/webhooks/twilio/sms`
- [ ] Cal.com webhook configured with secret: `https://api.conversionops.in/v1/webhooks/calcom`
- [ ] Stripe webhook configured: `https://api.conversionops.in/v1/webhooks/stripe`

### DNS + Domains
- [ ] `api.conversionops.in` → Cloud Run API service URL (custom domain mapping)
- [ ] `app.conversionops.in` → Vercel (dashboard)
- [ ] `conversionops.in` → Vercel (marketing site)
- [ ] `admin.conversionops.in` → Vercel (admin console)
- [ ] SPF record set for `conversionops.in` (Resend domain verification)
- [ ] DKIM record set (Resend → DNS)
- [ ] DMARC record set

### First Deploy
- [ ] `pnpm run type-check` → zero errors
- [ ] `pnpm run test` → all pass
- [ ] `pnpm run test:isolation` → all 8 isolation tests pass
- [ ] Prisma migrations run against production DB
- [ ] `gcloud run services replace infra/gcp/cloud-run-api.yaml --region=us-central1`
- [ ] `gcloud run services replace infra/gcp/cloud-run-worker.yaml --region=us-central1`
- [ ] Cloud Build trigger configured (push to main → auto-deploy)

### Post-Deploy Smoke Tests
- [ ] `curl https://api.conversionops.in/v1/health/live` → `{"alive":true}`
- [ ] `curl https://api.conversionops.in/v1/health/ready` → `{"ready":true}`
- [ ] `curl https://api.conversionops.in/v1/health` → `{"status":"healthy"}`
- [ ] `curl https://api.conversionops.in/v1/metrics` → Prometheus text format
- [ ] Magic link email sends (test with a real email address)
- [ ] Lead intake webhook fires correctly (POST to `/v1/webhooks/lead`)
- [ ] AI response generated within 60s of lead intake
- [ ] SMS delivered to test phone number

### Monitoring
- [ ] Cloud Monitoring alert policies applied (`infra/gcp/monitoring-alerts.yaml`)
- [ ] Notification channel created (email or Slack)
- [ ] Uptime check created for `https://api.conversionops.in/v1/health/live`
- [ ] Sentry project created, SENTRY_DSN set in Secret Manager

### Compliance
- [ ] Privacy policy live at `https://conversionops.in/legal/privacy`
- [ ] Terms of service live at `https://conversionops.in/legal/terms`
- [ ] TCPA consent language reviewed by legal counsel
- [ ] Data retention policy reviewed (audit logs: 7yr, transcripts: 2yr)

---

## First Customer Onboarding Checklist

For each new workspace:
- [ ] Create workspace via admin console or API
- [ ] Verify workspace token quota set correctly for plan (SOLO: 2M, BROKERAGE: 10M)
- [ ] Twilio number assigned to workspace (`twilioNumber` field)
- [ ] AI configuration reviewed (timezone, agentName, agentRole)
- [ ] Test lead intake end-to-end in the new workspace
- [ ] Confirm AI response arrives within 60s
- [ ] Confirm agent email notification fires

---

## Rollback Readiness
- [ ] `.\infra\scripts\rollback.ps1 -DryRun -Service all` runs without error
- [ ] Previous stable revision identified: `gcloud run revisions list --service=conversionops-api`
- [ ] Rollback command tested in staging (if applicable)

---

## Emergency Contacts

| Contact | Role | When to call |
|---------|------|-------------|
| [Platform on-call] | SRE | P0/P1 incidents |
| Twilio support | SMS issues | Twilio outage > 30 min |
| GCP support | Infrastructure | Cloud SQL / Redis down |
| Stripe support | Billing | Payment processing failures |
