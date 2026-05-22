# ConversionOps — GCP Budget Alerts Setup

## Monthly Cost Estimate

| Service | 10 customers | 50 customers | 200 customers |
|---------|-------------|-------------|--------------|
| Cloud Run API (min:1) | $20 | $35 | $80 |
| Cloud Run Worker (min:1) | $8 | $15 | $35 |
| Cloud SQL db-g1-small | $8 | $8 | $20 (upgrade needed) |
| Memorystore Standard 1GB | $30 | $30 | $55 (upgrade to 2GB) |
| Vertex AI (est. 2M tokens/mo) | $1.50 | $7.50 | $30 |
| Twilio SMS (est. 1000 msg/mo) | $7.50 | $37.50 | $150 |
| Artifact Registry | $0.50 | $0.50 | $1 |
| Cloud Build (120 build-min/day) | $0 | $5 | $15 |
| Logging + Monitoring | $0 | $2 | $8 |
| **TOTAL (GCP only)** | **~$68** | **~$100** | **~$250** |
| **+ Twilio** | **~$76** | **~$138** | **~$400** |

## Cost Abuse Protections

Already implemented in code:
- Per-workspace token quotas enforced before every AI call (`checkQuota()`)
- Circuit breaker opens immediately on `RESOURCE_EXHAUSTED` (prevents runaway Vertex AI spend)
- Quota alert emails sent at 80% usage (`alertIfApproaching()`)
- Hard stop at 100% — AI pauses, leads escalated to agents

## Budget Alert Setup

```bash
# Create billing budget with alerts at 50%, 80%, 100%
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="ConversionOps Monthly Budget" \
  --budget-amount=200USD \
  --threshold-rule=percent=50,basis=CURRENT_SPEND \
  --threshold-rule=percent=80,basis=CURRENT_SPEND \
  --threshold-rule=percent=100,basis=CURRENT_SPEND \
  --notifications-rule-pubsub-topic=projects/PROJECT_ID/topics/budget-alerts \
  --filter-projects=projects/PROJECT_ID
```

## Vertex AI Quota Tiers

| Plan | Token Quota/Month | Monthly AI Cost (est.) |
|------|-----------------|----------------------|
| SOLO | 2,000,000 | ~$0.15 |
| BROKERAGE | 10,000,000 | ~$0.75 |
| ENTERPRISE | Custom | Variable |

One tenant cannot exhaust platform capacity because:
1. Per-workspace quota limits are enforced at the code layer
2. GCP Vertex AI has per-project rate limits (configurable in console)
3. Circuit breaker prevents cascading failures from one workspace's AI abuse

## Scaling Decision Points

| Metric | Threshold | Action |
|--------|-----------|--------|
| Cloud SQL CPU > 80% for 15min | → | Upgrade to db-n1-standard-2 (~$52/mo) |
| Redis memory > 85% | → | Scale to 2GB tier (~$60/mo) |
| API p95 latency > 2s | → | Increase Cloud Run min-instances or vCPU |
| Worker queue lag > 200 jobs | → | Increase worker max-instances to 5 |
| Vertex AI > $50/month | → | Review per-workspace quotas, enable caching |
