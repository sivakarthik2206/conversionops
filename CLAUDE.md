# ConversionOps — Claude Code Master Context
# Read this file fully. Then read the sub-files listed below for your current phase.

---

## WHAT THIS IS
AI lead conversion infrastructure for US real estate agents and brokerages.
Not a chatbot. Not a CRM. Operational infrastructure.
Every inbound lead gets an AI response in 60 seconds, 24/7.

## DOMAIN: docs/claude/DOMAIN.md
Product, customers, pricing, target markets, the 9 problems we solve.

## ARCHITECTURE: docs/claude/ARCHITECTURE.md
Full monorepo structure, package dependency graph, technology stack,
GCP-only infrastructure, local dev setup, database schema contract,
all 20 Prisma models, JSON field policy, lead status machine.

## STANDARDS: docs/claude/STANDARDS.md
Backend rules (CQRS, tenant isolation, idempotency, Result type, audit logging),
compliance invariants (TCPA, Fair Housing, CCPA, data retention),
AI system rules (pre-send checklist, metadata, token quotas, escalation, memory),
error classes, testing standards, code quality, naming, git conventions.

## FRONTEND: docs/claude/FRONTEND.md
Complete design system: all CSS variables, typography scale, spacing system,
border radius, shadows, animation tokens, component requirements,
dashboard layout, sidebar navigation, key component specs (ConversationThread,
LeadCard, MetricCard, DataTable), onboarding flow design,
marketing site specs.

## PHASES: docs/claude/PHASES.md
All 10 build phases with exact file lists and implementation notes.
Current phase status. Queue architecture. API routes. Business logic.

---

## QUICK REFERENCE — RULES THAT OVERRIDE EVERYTHING

### Tenant Isolation (security critical)
```typescript
// WRONG — never do this
prisma.lead.findUnique({ where: { id } })
// CORRECT — always scope to workspace
prisma.lead.findUnique({ where: { id, workspaceId: ctx.workspaceId } })
// Returns null if wrong workspace → HTTP 404. Never 403. Never confirm cross-tenant existence.
```

### TCPA (legal — cannot be bypassed)
Never send SMS without: ConsentRecord OPTED_IN + not quiet hours (9pm-8am local) + not opted out.
Opt-out keywords: STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT.
These are invariants. Not feature flags. Not configurable.

### Result Type (package boundary rule)
```typescript
// Never throw across package boundaries — always return Result<T,E>
import { ok, err } from '@conversionops/sdk-standards';
async function doThing(): Promise<Result<Lead>> { ... }
```

### Lead Status (XState only)
Never set lead.status directly. Only via XState machine in
packages/orchestration/src/workflows/lead-lifecycle.workflow.ts.

### Idempotency (all external webhooks)
Every Twilio/Stripe/Cal.com webhook checks IdempotencyKey table first.
Keys: twilio:sms:${MessageSid} | stripe:${event.id} | calcom:booking:${uid}

### Audit Logging (all consequential actions)
Enqueue to audit-log BullMQ queue — never write synchronously.
Consequential = any write visible to users in dashboard.

### No console.log
Use logger from @conversionops/observability everywhere.

### TypeScript strict
No `any`. No `!` assertions. No `@ts-ignore`. Fix the actual type error.

---

## TECHNOLOGY STACK (quick ref)

```
Backend:    NestJS 10, Node 20, TypeScript 5.4 strict, Prisma 5, BullMQ 5, XState 5
AI:         Google Vertex AI Gemini 1.5 Flash (@google-cloud/vertexai) — GCP ONLY
Database:   PostgreSQL 16 (GCP Cloud SQL)
Cache:      Redis 7 (GCP Memorystore)
SMS/Voice:  Twilio
Email:      Resend (not AWS SES)
Booking:    Cal.com
Frontend:   Next.js 14 App Router, TypeScript strict, Tailwind, Framer Motion (dashboard)
Infra:      GCP Cloud Run (API + Worker) + Vercel free tier (3 frontends) — NO AWS, NO AZURE
```

## PACKAGE NAMES
```
@conversionops/db          @conversionops/types        @conversionops/auth
@conversionops/config      @conversionops/compliance    @conversionops/ai
@conversionops/orchestration  @conversionops/integrations  @conversionops/observability
@conversionops/sdk-standards  @conversionops/ui
```

## ENV VARS (key ones)
```
DATABASE_URL                     REDIS_URL
GOOGLE_CLOUD_PROJECT             VERTEX_AI_MODEL=gemini-1.5-flash-001
GOOGLE_APPLICATION_CREDENTIALS   TWILIO_ACCOUNT_SID / AUTH_TOKEN / PHONE_NUMBER
STRIPE_SECRET_KEY                RESEND_API_KEY
JWT_SECRET (min 64 chars)        MAGIC_LINK_SECRET (min 64 chars)
NEXT_PUBLIC_API_URL              NEXT_PUBLIC_WS_URL
```

## CURRENT BUILD STATE
- Phase 1 COMPLETE: Prisma schema migrated (20260518104338_init), seed working
- pnpm run type-check: PASSING across all 16 packages
- Phase 2: START HERE

## SESSION START CHECKLIST
1. Read this CLAUDE.md
2. Read the sub-file(s) relevant to your current phase
3. Identify current phase from docs/claude/PHASES.md
4. Run pnpm run type-check — fix any existing errors first
5. Implement only current phase files — never skip ahead

## DEFINITION OF DONE
```
TypeScript strict — zero errors, zero `any`
All imports resolve to implemented files (no stubs importing stubs)
Unit tests written and passing
workspaceId on ALL Prisma queries
TCPA check on any SMS send path
IdempotencyKey on any external webhook
AuditLog queued for any consequential action
Result<T,E> returned across package boundaries
No console.log
JSDoc on all public service methods
pnpm run type-check passes
pnpm run test passes
pnpm run test:isolation passes (Phase 3+)
```

## ABSOLUTE PROHIBITIONS
```
No Kubernetes          No AWS            No Azure
No hard deletes        No integer IDs     No global Prisma queries without workspaceId
No direct lead.status  No any type        No @ts-ignore
No console.log         No throws across   No TCPA bypass
                       package boundaries
No future phases       No microservices   No separate read/write DB
without instruction
```
