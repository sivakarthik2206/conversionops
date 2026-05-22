# ConversionOps — Incident Response Runbook

## Severity Levels

| Level | Definition | Response SLA |
|-------|-----------|-------------|
| P0 | Complete outage — no leads are being processed, SMS down | 15 min |
| P1 | Partial outage — AI failing, queue backlog > 500, Twilio errors | 30 min |
| P2 | Degraded — increased latency, CRM sync failing, some errors | 2 hours |
| P3 | Minor — non-critical errors, analytics gaps | Next business day |

---

## Quick Triage

```bash
# 1. Check health
curl https://api.conversionops.in/v1/health | jq

# 2. Check metrics
curl https://api.conversionops.in/v1/metrics

# 3. Check Cloud Run logs (last 100 lines)
gcloud run services logs read conversionops-api --region=us-central1 --limit=100
gcloud run services logs read conversionops-worker --region=us-central1 --limit=100

# 4. Check current revision
gcloud run revisions list --service=conversionops-api --region=us-central1
```

---

## Scenario 1 — API Down (HTTP 500 / 503)

**Symptoms:** Health endpoint returning down/degraded, lead intake failing

```bash
# Check recent logs
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="conversionops-api" AND severity>=ERROR' \
  --project=PROJECT_ID --freshness=10m --format=json | jq '.[].textPayload'

# Check if it's a deployment issue — rollback
.\infra\scripts\rollback.ps1 -Service api -Steps 1

# Verify rollback took effect
.\infra\scripts\health-check.ps1
```

---

## Scenario 2 — Worker Crash Loop / Job Backlog

**Symptoms:** Queue lag metric > 500, leads not getting AI responses

```bash
# Check worker logs
gcloud logging read 'resource.labels.service_name="conversionops-worker" AND severity>=ERROR' \
  --project=PROJECT_ID --freshness=30m --format=json | jq '.[].textPayload'

# Check Redis queue state (run from a machine with Redis access or Cloud Shell)
redis-cli -u $REDIS_URL LLEN bull:ai-response:wait
redis-cli -u $REDIS_URL LLEN bull:ai-response:failed

# Restart worker (deploys same revision — triggers pod restart)
gcloud run services update conversionops-worker \
  --region=us-central1 \
  --set-env-vars=RESTART_TRIGGER=$(date +%s)

# For persistent failures, check for stuck jobs
redis-cli -u $REDIS_URL KEYS "bull:*:failed" | xargs -I{} redis-cli LRANGE {} 0 5
```

---

## Scenario 3 — Gemini / Vertex AI Outage

**Symptoms:** AI latency metric > 10s, `CIRCUIT_OPEN` errors in logs, leads not being responded to

```bash
# Check GCP service health
open https://status.cloud.google.com

# AI is designed to degrade gracefully — conversations are paused, leads queued
# Human agents should be notified via the escalation queue

# Monitor circuit breaker state
curl https://api.conversionops.in/v1/health | jq '.services.vertexAi'

# Leads will auto-resume when Gemini recovers (circuit breaker half-open → closed)
# No manual intervention needed unless outage > 1 hour

# If outage > 1 hour — manually pause AI for all workspaces via admin endpoint
curl -X POST https://api.conversionops.in/v1/admin/ai/pause-all \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Scenario 4 — Twilio Outage

**Symptoms:** SMS delivery failures, `TWILIO_ERROR` in logs

```bash
# Check Twilio status
open https://status.twilio.com

# SMS failures are logged but jobs are retried with BullMQ backoff
# Leads are NOT lost — messages persist in DB even if SMS delivery fails

# Check delivery failure rate
gcloud logging read 'textPayload:"ai-response: SMS not sent"' \
  --project=PROJECT_ID --freshness=30m

# If > 20% SMS failure rate in 30 min → page on-call
```

---

## Scenario 5 — Database Connection Exhaustion

**Symptoms:** `/v1/health/ready` returns 503, `database` shows unhealthy

```bash
# Check active connections
# Run from Cloud SQL console or via psql proxy
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

# Prisma default pool size is 10 — Cloud SQL db-g1-small max is 25
# If saturated, check for long-running transactions:
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle' AND query_start < now() - interval '5 minutes';

# Kill long-running queries
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE duration > interval '5 minutes' AND state != 'idle';

# If persistent — scale up Cloud SQL to db-n1-standard-2
gcloud sql instances patch conversionops-db \
  --project=PROJECT_ID \
  --tier=db-n1-standard-2
```

---

## Scenario 6 — Redis Disconnection

**Symptoms:** Queue processing stops, health shows redis unhealthy

```bash
# Check Memorystore status
gcloud redis instances describe conversionops-redis --region=us-central1

# BullMQ will queue internally and reconnect automatically
# Jobs are not lost — they persist in Redis until processed

# If Redis is completely down:
# 1. All queue processing halts
# 2. Webhooks will still be received but not enqueued (they'll 500)
# 3. Recovery: when Redis recovers, BullMQ reconnects and processes backlog

# Emergency: If Redis data is lost, any in-flight jobs are lost.
# Check BullMQ dead-letter queue and replay critical jobs:
redis-cli -u $REDIS_URL LRANGE bull:lead-intake:failed 0 -1
```

---

## Rollback Procedure

```powershell
# Rollback both services to previous revision
.\infra\scripts\rollback.ps1 -Service all -Steps 1

# Rollback only API (if worker deploy is fine)
.\infra\scripts\rollback.ps1 -Service api -Steps 1

# Rollback to a specific revision
gcloud run services update-traffic conversionops-api \
  --region=us-central1 \
  --to-revisions=conversionops-api-abc123=100

# Verify rollback
.\infra\scripts\health-check.ps1
```

---

## Post-Incident

1. Write incident timeline (what happened, when, who, impact)
2. Run `pnpm run test:isolation` to verify tenant isolation still intact
3. Check audit log for any anomalous cross-tenant operations during incident
4. Update relevant runbook with new learnings
5. Consider whether any alerting threshold should be adjusted
