# ConversionOps — Architecture Reference
# docs/claude/ARCHITECTURE.md

## MONOREPO STRUCTURE
```
conversionops/
├── apps/
│   ├── api/          NestJS API               GCP Cloud Run ~$35/mo
│   ├── worker/       BullMQ Worker             GCP Cloud Run ~$10/mo
│   ├── web/          Marketing site            Vercel free
│   ├── app/          Product dashboard         Vercel free
│   └── admin/        Internal ops console      Vercel free
├── packages/
│   ├── db/           Prisma schema + client + repositories
│   ├── types/        Shared TypeScript types
│   ├── auth/         JWT + RBAC + magic link
│   ├── config/       Zod env validation + feature flags
│   ├── compliance/   TCPA + Fair Housing + CCPA (legal invariants)
│   ├── ai/           Vertex AI + evals + governance + memory
│   ├── orchestration/BullMQ queues + XState + event store
│   ├── integrations/ Twilio + Resend + Cal.com + CRM
│   ├── observability/Pino logging + health metrics
│   ├── sdk-standards/Error classes + Result<T> + retry utils
│   └── ui/           Design system + components
└── infra/
    ├── gcp/          Cloud Run + Cloud SQL + Memorystore
    ├── docker/       Local Postgres + Redis
    └── scripts/      Setup scripts
```

## PACKAGE DEPENDENCY GRAPH (strict — never violate)
```
sdk-standards   ← no internal deps (foundational)
types           ← no internal deps (foundational)
config          ← sdk-standards
db              ← types
auth            ← sdk-standards, types
compliance      ← db, sdk-standards
observability   ← sdk-standards
ai              ← db, types, compliance, sdk-standards
orchestration   ← db, types, sdk-standards
integrations    ← compliance, sdk-standards
ui              ← types only (ZERO backend imports)

api             ← ALL packages
worker          ← db, ai, compliance, orchestration, integrations, observability
web             ← ui only
app             ← ui, types (HTTP only — no direct backend imports)
admin           ← ui, types (HTTP only)
```

## GCP INFRASTRUCTURE (only cloud — no AWS, no Azure)
```
API:        Cloud Run (min 1 instance, 512MB RAM, 1 vCPU)
Worker:     Cloud Run (scale to zero, 1GB RAM, 2 vCPU)
Database:   Cloud SQL PostgreSQL 16 (db-f1-micro, 10GB SSD)
Redis:      Memorystore Basic 1GB
CI/CD:      Cloud Build (triggered on main branch push)
Registry:   Artifact Registry (Docker images)
Secrets:    Secret Manager (all credentials)
AI:         Vertex AI Gemini 1.5 Flash (pay per token ~$0.075/1M input)
Total:      ~$88/month
```

## DATABASE — 20 MODELS

### Core Platform
```
Workspace        Tenancy root. Every other record belongs to a workspace.
User             Platform identity. Can belong to multiple workspaces.
WorkspaceUser    User ↔ Workspace join with UserRole (OWNER/ADMIN/AGENT/VIEWER)
```

### Lead Domain
```
Lead             Core business object. Status = XState machine state.
LeadAssignment   Every routing decision ever made (not just current).
LeadEvent        Append-only business event log. Sequence per lead.
```

### Conversation Domain
```
Conversation     The messaging channel for a lead. Channel: SMS/EMAIL/CHAT.
Message          Immutable. Every message ever sent. role: AI/HUMAN/SYSTEM.
```

### Operations
```
Appointment      Booked meetings. Links to Cal.com external booking.
WorkflowExecution BullMQ job lifecycle tracking.
WorkflowEvent    Step-by-step workflow audit trail.
```

### Compliance
```
ConsentRecord    TCPA consent per phone+channel. OPTED_IN required before SMS.
```

### AI
```
AIUsageRecord    Token tracking per workspace per call. billingMonth integer.
AIEvalResult     Quality scores per AI message. hallucinationScore indexed.
```

### Platform
```
RoutingRule      Brokerage routing logic. Evaluated by priority order.
Notification     Every outbound alert tracked with status.
IdempotencyKey   Prevents duplicate webhook processing. 24hr TTL.
AuditLog         Immutable. 7-year legal hold. Never purge.
FeatureFlagOverride Workspace-level feature flags (JSON value).
OperationalMetric Time-series health metrics. 90-day retention.
```

## MANDATORY FIELD RULES
Every model MUST have ALL of these:
```prisma
workspaceId  String    // every model except Workspace and User
createdAt    DateTime  @default(now())
updatedAt    DateTime  @updatedAt
deletedAt    DateTime? // soft delete — NEVER hard delete
```

Every model MUST have at minimum:
```prisma
@@index([workspaceId, createdAt])
@@index([workspaceId, status])  // if model has status field
```

## JSON FIELD POLICY
```
GOOD (unstructured, not queried):  aiMetadata, qualification, sourcePayload,
                                    aiConfig, featureFlags, conditions, providerPayload
BAD (use typed columns instead):   anything filtered, sorted, aggregated, or joined
```

## LEAD STATUS MACHINE
```
NEW → CONTACTED → QUALIFYING → QUALIFIED → ROUTING → ASSIGNED
    → APPOINTMENT_REQUESTED → APPOINTMENT_SCHEDULED → CONVERTED

Dormancy:  NEW → UNRESPONSIVE → DORMANT ↔ REACTIVATED
Terminal:  OPT_OUT (from any state), DISQUALIFIED, CONVERTED

RULE: Only updated via XState machine in
packages/orchestration/src/workflows/lead-lifecycle.workflow.ts
NEVER set lead.status directly anywhere else.
```

## CQRS PATTERN — EVERY MODULE
```
modules/[domain]/
├── [domain].module.ts       NestJS module
├── [domain].controller.ts   HTTP only → delegates to handlers
├── [domain].service.ts      Orchestration only → no Prisma here
├── commands/
│   ├── [action].command.ts  Data class: intent + payload
│   └── [action].handler.ts  Writes DB, enqueues jobs, returns Result<T>
└── queries/
    ├── get-[x].query.ts     Filter params
    └── get-[x].handler.ts   Reads only, raw SQL allowed, returns DTOs
```
- Controllers: commands for mutations, queries for reads
- Command handlers: NEVER call query handlers
- Query handlers: NEVER mutate state
- Repositories: called by handlers only

## RBAC PERMISSIONS
```
OWNER:  everything including billing + workspace deletion
ADMIN:  everything except billing
AGENT:  own conversations + leads assigned to them
VIEWER: read-only dashboard + analytics
```

## API ROUTES
```
POST  /v1/auth/magic-link          POST  /v1/auth/verify
GET   /v1/workspaces/me            PATCH /v1/workspaces/me
GET   /v1/workspaces/me/health     PATCH /v1/workspaces/me/ai-config
POST  /v1/workspaces/me/ai/pause   POST  /v1/workspaces/me/ai/resume
GET   /v1/leads                    POST  /v1/leads
GET   /v1/leads/:id                PATCH /v1/leads/:id
POST  /v1/leads/:id/assign         POST  /v1/leads/:id/reactivate
GET   /v1/conversations            GET   /v1/conversations/:id
POST  /v1/conversations/:id/takeover  POST /v1/conversations/:id/release
POST  /v1/conversations/:id/message   POST /v1/conversations/:id/escalate
GET   /v1/appointments             PATCH /v1/appointments/:id
GET   /v1/agents                   POST  /v1/agents/invite
PATCH /v1/agents/:id               DELETE /v1/agents/:id
GET   /v1/analytics/funnel         GET   /v1/analytics/response-times
GET   /v1/analytics/lead-sources
GET   /v1/routing-rules            POST  /v1/routing-rules
PATCH /v1/routing-rules/:id        DELETE /v1/routing-rules/:id
POST  /v1/billing/checkout         POST  /v1/billing/portal

# Webhooks (validated by provider signature — no JWT auth)
POST  /v1/webhooks/twilio/sms      POST  /v1/webhooks/twilio/voice
POST  /v1/webhooks/stripe          POST  /v1/webhooks/calcom
POST  /v1/webhooks/zillow          POST  /v1/webhooks/lead
```

## QUEUE ARCHITECTURE — 12 QUEUES
```
lead-intake           Entry point for all new leads
ai-response           Generate + send AI message (TCPA first)
qualification         7-question chain on each reply
lead-routing          Match scored lead to agent
appointment-booking   Send Cal.com link + confirm
crm-sync              Sync to FUB/Zapier (withRetry)
missed-call           SMS text-back within 8 seconds
reactivation          Dormant lead revival
notification          Agent alerts
analytics-ingest      Funnel event recording
audit-log             Async audit writes (never block HTTP)
retention             Nightly 3am UTC purge cron
```

## LEAD SCORING ALGORITHM
```typescript
timeline:    30pts  (30_days=30, 90_days=20, 6_months=10, browsing=0)
financing:   25pts  (pre_approved/cash=25, needs_financing=10, unknown=0)
budget:      20pts  (>$500k=20, >$300k=15, >$100k=8, else=3)
urgency:     15pts  (immediate=15, near_term=8, browsing=0)
engagement:  10pts  (derived from turns + response speed, max 10)
Total max:   100pts

Tiers: PRIORITY 80-100 | HOT 60-79 | WARM 30-59 | COLD 0-29
```

## ROUTING PRIORITY ORDER
```
1. LANGUAGE match (always first)
2. GEOGRAPHY match (serviceAreas)
3. AVAILABILITY (isAvailable + not past unavailableUntil)
4. PERFORMANCE (highest conversionRate)
5. ROUND_ROBIN (fallback)
```
