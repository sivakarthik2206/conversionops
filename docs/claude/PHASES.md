# ConversionOps — Build Phases
# docs/claude/PHASES.md

## CURRENT STATE
- Phase 1 COMPLETE: Schema migrated (20260518104338_init), seed working
- type-check: PASSING all 16 packages
- Phase 2: CURRENT — start here

---

## PHASE 1 — COMPLETE ✓
Prisma schema: 20 models, 21 enums, 87+ indexes
File: packages/db/prisma/schema.prisma
Migration: 20260518104338_init applied
Seed: demo-brokerage workspace confirmed

---

## PHASE 2 — NestJS API Skeleton

```
apps/api/src/modules/prisma/
  prisma.service.ts       Extends PrismaClient, OnModuleInit $connect, shutdown hooks
  prisma.module.ts        global:true, exports PrismaService

apps/api/src/common/
  filters/http-exception.filter.ts   All exceptions → standard error shape
                                      TenantLeakageError → 404
                                      IdempotencyConflictError → 202
  decorators/user.decorator.ts       @CurrentUser() from request.user
  decorators/workspace.decorator.ts  @CurrentWorkspace() from request.workspace
  pipes/zod-validation.pipe.ts       Zod schema in constructor, field-level errors

packages/auth/src/
  jwt.ts          signToken(payload,secret,expiry) + verifyToken() → Result<JWTPayload>
  magic-link.ts   generateMagicLinkToken() + verifyMagicLinkToken() → Result<{email}>
                  Uses Node crypto — no external deps

apps/api/src/modules/auth/
  auth.service.ts        sendMagicLink() + verifyMagicLink() → Result<{jwt,user}>
  auth.controller.ts     POST /magic-link + POST /verify
  auth.module.ts

apps/api/src/app.module.ts   ConfigModule(global) + PrismaModule + AuthModule
apps/api/src/main.ts         helmet, compression, ValidationPipe, prefix 'v1', CORS
```

---

## PHASE 3 — Tenancy + Security

```
apps/api/src/common/
  guards/auth.guard.ts         Validates JWT, loads User+Workspace, attaches to request
  decorators/public.decorator.ts  @Public() for auth endpoints
  guards/rbac.guard.ts         @RequirePermission decorator, checks ROLE_PERMISSIONS
  middleware/tenant.middleware.ts  Attaches workspaceId to every authenticated request
  interceptors/audit.interceptor.ts  Enqueues AuditLog after every mutating request

packages/db/src/repositories/
  workspace.repository.ts     findById, findBySlug, create, update
  lead.repository.ts          ALL queries scoped by workspaceId — every method

apps/api/src/modules/
  workspace/  (full CQRS)
    GET /workspaces/me, PATCH /workspaces/me, GET /workspaces/me/health
    PATCH /workspaces/me/ai-config
    POST /workspaces/me/ai/pause, POST /workspaces/me/ai/resume

  lead/ (full CQRS)
    GET /leads, POST /leads, GET /leads/:id, PATCH /leads/:id
    POST /leads/:id/assign, POST /leads/:id/reactivate

  conversation/ (CQRS + human override)
    GET /conversations, GET /conversations/:id
    POST /conversations/:id/takeover, POST /conversations/:id/release
    POST /conversations/:id/message, POST /conversations/:id/escalate
    human-override.service.ts: takeoverConversation, releaseToAI, escalate, isAIAllowed

  agent/ (CQRS)
    GET /agents, POST /agents/invite, PATCH /agents/:id, DELETE /agents/:id

apps/api/src/__tests__/isolation/
  tenant-isolation.spec.ts     All 8 mandatory isolation tests — full implementation
  rbac-isolation.spec.ts
  websocket-isolation.spec.ts
```

---

## PHASE 4 — Orchestration

```
packages/orchestration/src/
  idempotency/idempotency.service.ts
    acquire(key,source,workspaceId) → cached result or null
    complete(key,result), fail(key), purgeExpired()

  events/event-store.ts
    append(event) — atomic sequence per leadId
    getHistory(leadId), replay(leadId) → LeadState

  workflows/lead-lifecycle.workflow.ts
    XState v5 — ALL states and transitions
    Every transition emits LeadEvent via event-store
    Pure functional — no side effects

  notifications/notification.service.ts
    notifyAgent, notifyWorkspace, sendOpsAlert

apps/worker/src/
  worker.module.ts
  processors/lead-intake.processor.ts
  processors/lead-routing.processor.ts     Language→Geography→Availability→Performance→RoundRobin
  processors/audit-log.processor.ts        Never throws — fire and forget
  processors/notification.processor.ts     Routes to SMS/email by agent prefs

apps/api/src/modules/routing/ (full CQRS)
  GET /routing-rules, POST /routing-rules, PATCH /:id, DELETE /:id
```

---

## PHASE 5 — Twilio Intake Loop (first E2E production loop)

```
packages/compliance/src/tcpa/index.ts     FINAL — isOptOutKeyword, isQuietHours, validateConsent
packages/compliance/src/fair-housing/     FINAL — comprehensive FHA patterns

packages/integrations/src/comms/twilio/index.ts
  TwilioClient: sendSMS (TCPA check built-in), validateWebhookSignature, provision/release number

packages/ai/src/
  client/index.ts           VertexAIClient — Gemini 1.5 Flash, withRetry, records AIUsageRecord
  prompts/system.prompt.ts  buildSystemPrompt(workspace)
  prompts/response.prompt.ts  buildResponsePrompt(lead, workspace)
  prompts/qualification.prompt.ts  7-question flow, smart progression, booking intent detection
  chains/qualification.chain.ts   runQualificationChain → { content, extractedData, shouldBook }
  scoring/lead-scorer.ts          calculateScore, getTier, updateLeadScore
  governance/token-budget.ts      checkQuota, trackUsage, alertAt80Percent
  memory/conversation-memory.ts   buildContext with summarisation (>20 msgs)

apps/api/src/webhooks/
  twilio/sms.webhook.ts
    1. Validate Twilio signature
    2. Check IdempotencyKey
    3. Check ConsentRecord / detect opt-in
    4. Check opt-out keyword
    5. Enqueue lead-intake
    6. Return 200 <Response/> within 5s
  twilio/voice.webhook.ts     Missed call → enqueue missed-call (HIGHEST priority)
  zillow/zillow.webhook.ts
  generic/generic-lead.webhook.ts

apps/worker/src/processors/
  ai-response.processor.ts   Complete 7-step pre-send checklist (see STANDARDS.md)
  qualification.processor.ts  Score update, tier update, QUALIFIED transition
  missed-call.processor.ts    SMS within 8s, create Lead+Conversation
```

---

## PHASE 6 — Realtime

```
apps/api/src/gateway/
  workspace.rooms.ts     getRoomName, joinWorkspace, emitToWorkspace
                         Security: clients can ONLY join own workspace room
  realtime.gateway.ts    Socket.IO + Redis adapter (@socket.io/redis-adapter)
                         handleConnection: verify JWT, join workspace room
                         @SubscribeMessage('join:conversation'): verify ownership first

  Events emitted to workspace room:
    lead:created, lead:scored, lead:assigned
    message:new, conversation:takeover
    appointment:booked, notification:new

  Inject RealtimeGateway into ALL processors — emit after state changes

apps/app/src/hooks/
  useRealtime.ts       Socket.IO client, auto-reconnect, typed event map
  useConversations.ts  TanStack Query + real-time optimistic updates
  useLeads.ts          TanStack Query + real-time optimistic updates
```

---

## PHASE 7 — Dashboard + Marketing Site

Priority order for apps/app/:
```
1. globals.css              All CSS variables, Google Fonts import
2. packages/ui/             Complete primitives: Button, Input, Badge, Card,
                            Skeleton, Avatar, Modal, Toast, Tooltip, Spinner
3. Sidebar + Topbar         Fixed layout shell
4. /conversations           Inbox + thread (most-used screen)
5. /conversations/[id]      Full lead context view
6. /leads                   Pipeline (list + kanban toggle)
7. /leads/[id]              Lead detail + event timeline
8. /onboarding/*            All 6 steps with animations
9. /analytics               Funnel + charts
10. /settings/*             Workspace, AI config (with live preview), billing
11. /routing, /agents, /integrations, /appointments
```

For apps/web/:
```
1. globals.css + font setup
2. Homepage — all sections (Hero through Footer)
3. /demo — interactive, zero signup, auto-plays on load
4. /pricing, /book, /legal
```

---

## PHASE 8 — AI Evals + Compliance

```
packages/ai/src/evals/
  fixtures/qualification-cases.json   30 realistic test fixtures
  fixtures/edge-cases.json            20 edge cases
  scorers/relevance.scorer.ts         LLM-based 0-1 relevance score
  scorers/hallucination.scorer.ts     LLM chain-of-thought, >0.3 flag, >0.6 block
  scorers/booking-intent.scorer.ts    Deterministic keyword + turn analysis
  scorers/qualification.scorer.ts     Fields answered / total fields
  runners/eval-runner.ts              Async post-generation, writes AIEvalResult
  runners/regression-runner.ts        CI gate, fails if score drops >5%

packages/ai/src/guardrails/hallucination-guard.ts
  Fast rule-based + LLM scorer combo
  Returns { allowed, confidence, flaggedClaims }

packages/compliance/src/
  ccpa/index.ts         deletePII, exportUserData
  retention/index.ts    enforceRetentionPolicies (nightly cron logic)

apps/worker/src/processors/retention.processor.ts
```

---

## PHASE 9 — CRM + Booking

```
packages/integrations/src/
  crm/follow-up-boss/
    client.ts   createLead, updateLead, createNote — rate limited, withRetry
    sync.ts     syncLeadToFUB — maps Lead → FUB format, pushes transcript
  crm/zapier/
    webhook-relay.ts   Universal fallback, standardised JSON payload
  booking/cal-com/
    client.ts    getAvailability, createBookingLink, getBooking, cancelBooking
    webhooks.ts  parseCalComWebhook → type discriminated union

apps/api/src/modules/appointment/  (full CQRS)
  GET /appointments, PATCH /appointments/:id

apps/api/src/webhooks/calcom/booking.webhook.ts
  Idempotent (key: calcom:booking:${uid})
  BOOKING_CREATED → create Appointment, APPOINTMENT_SCHEDULED, notify
  BOOKING_CANCELLED → CANCELLED, revert to QUALIFIED

apps/worker/src/processors/
  crm-sync.processor.ts          FUB or Zapier, 3 retries exponential backoff
  appointment-booking.processor.ts  Personalised Cal.com link via SMS
  reactivation.processor.ts       Dormant leads, count<3, consent check, personalised message
```

---

## PHASE 10 — Analytics + Ops Console

```
apps/api/src/modules/analytics/queries/
  get-funnel.handler.ts         Raw SQL, counts + conversion rates + avg time-in-stage
  get-response-times.handler.ts  p50/p75/p90/p95/p99 percentiles by hour/day/source
  get-source-breakdown.handler.ts  Per-source: leads, qualified, booked, converted, rate

packages/observability/src/health/index.ts
  HealthCollector: recordAILatency, recordTwilioLatency, recordCRMResult, recordQueueLag
  getPlatformHealth() → PlatformHealthSummary (healthy/degraded/down)

apps/worker/src/processors/analytics-ingest.processor.ts
  Writes OperationalMetric, updates WorkspaceUser denormalised counters

apps/admin/src/app/ops/
  queues/page.tsx              All 12 queues: counts + job inspector + retry actions
  dead-letters/page.tsx        Failed jobs: error, stacktrace, bulk retry
  workflow-trace/[leadId]/     Full LeadEvent log + WorkflowExecution + AI eval scores
  ai-debug/page.tsx            Prompt playground against real workspace config
  ai-debug/evals/page.tsx      AIEvalResult browser, hallucination score filter
  health/page.tsx              Platform status + 24h time-series + auto-refresh 30s

apps/app/src/app/(dashboard)/analytics/page.tsx
  Funnel chart, lead volume area chart, response time histogram,
  source breakdown donut, top agents table, date range picker
```

---

## LEAD INTAKE FLOW (reference)
```
POST /v1/webhooks/twilio/sms
  → validate signature → idempotency check → consent check → opt-out check
  → enqueue lead-intake → return 200 <Response/> (< 5s always)

lead-intake: create Lead + LeadEvent → enqueue ai-response
ai-response: 7-step checklist (see STANDARDS.md) → send SMS → update XState
             → enqueue qualification + analytics + audit → emit Socket.IO
qualification: extract data → update score + tier → check QUALIFIED
```
