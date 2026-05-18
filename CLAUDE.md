# ConversionOps — Claude Code Master Context
# THE DEFINITIVE REFERENCE. READ EVERY WORD BEFORE WRITING ANY CODE.

> This file governs every Claude Code session without exception.
> Every architectural decision, every naming convention, every UI token,
> every compliance rule, every phase boundary — lives here.
> When uncertain: re-read this file. Do not guess.

---

## SECTION 1 — PRODUCT IDENTITY

### What ConversionOps Is
AI-powered lead conversion infrastructure for US real estate agents and brokerages.
Not a chatbot. Not a CRM wrapper. Operational infrastructure that replaces an entire
inside sales function. The product responds to leads, qualifies them, books appointments,
syncs to CRM, and gives brokerages real-time operational visibility — all without the
agent lifting a finger.

### Core Promise
Every inbound lead — Zillow, Realtor.com, missed call, web form — receives a
personalised AI response within 60 seconds, 24 hours a day, 7 days a week.

### Revenue Model
- Tier 1 Solo Agent:       $3,500 setup + $750/month
- Tier 2 Small Brokerage:  $12,000 setup + $2,500/month (up to 15 agents)
- Tier 3 Enterprise:       $25,000 setup + $5,000/month (unlimited agents)

### Target Markets (priority order)
1. Miami / Fort Lauderdale, FL
2. Orlando, FL
3. Tampa / St. Pete, FL
4. San Diego, CA
5. Sacramento / Riverside, CA

### The 9 Revenue Leaks We Solve
1. Slow speed-to-lead (agents respond in 15+ hours — we respond in 60 seconds)
2. Missed calls (35-40% missed — we fire SMS text-back in 8 seconds)
3. Dead CRM leads (70% never properly followed up — we reactivate them)
4. Inconsistent follow-up (agents make 1-2 attempts — buyers need 8-12 touches)
5. Wasted Zillow spend ($1,200/month — 60% of leads uncontacted)
6. ISA cost ($45-65K/year — we replace core ISA function for $750/month)
7. No agent accountability (brokers blind to ignored leads — we show everything)
8. Poor routing (wrong leads to wrong agents — we route by performance/area/language)
9. Zero operational visibility (no analytics — we provide brokerage-wide funnels)

---

## SECTION 2 — MONOREPO STRUCTURE

```
conversionops/
├── apps/
│   ├── api/          NestJS API               → GCP Cloud Run
│   ├── worker/       BullMQ Worker             → GCP Cloud Run
│   ├── web/          Marketing site            → Vercel free tier
│   ├── app/          Product dashboard         → Vercel free tier
│   └── admin/        Internal ops console      → Vercel free tier
├── packages/
│   ├── db/           Prisma schema + client + repositories
│   ├── types/        Shared TypeScript types
│   ├── auth/         JWT + RBAC + magic link
│   ├── config/       Zod env validation + feature flags
│   ├── compliance/   TCPA + Fair Housing + CCPA (legal invariants)
│   ├── ai/           Vertex AI engine + evals + governance + memory
│   ├── orchestration/BullMQ queues + XState workflows + event store
│   ├── integrations/ Twilio + Resend + Cal.com + CRM clients
│   ├── observability/Pino logging + health metrics
│   ├── sdk-standards/Error classes + Result<T> + retry utilities
│   └── ui/           Design system + component library
├── infra/
│   ├── gcp/          Cloud Run + Cloud SQL + Memorystore YAML/Terraform
│   ├── docker/       Local dev docker-compose (Postgres + Redis)
│   └── scripts/      Setup and secret rotation scripts
└── tooling/          Shared ESLint + TypeScript base configs
```

### Package Dependency Rules (never violate)
```
sdk-standards   ← no internal deps
types           ← no internal deps
config          ← sdk-standards
db              ← types
auth            ← sdk-standards, types
compliance      ← db, sdk-standards
observability   ← sdk-standards
ai              ← db, types, compliance, sdk-standards
orchestration   ← db, types, sdk-standards
integrations    ← compliance, sdk-standards
ui              ← types only (zero backend imports)

api             ← all packages
worker          ← db, ai, compliance, orchestration, integrations, observability
web             ← ui only
app             ← ui, types only (calls API over HTTP)
admin           ← ui, types only (calls API over HTTP)
```

---

## SECTION 3 — COMPLETE TECHNOLOGY STACK

### Backend
```
Runtime:         Node.js 20 LTS
Framework:       NestJS 10.x
Language:        TypeScript 5.4+ strict mode always
ORM:             Prisma 5.x
Database:        PostgreSQL 16 (GCP Cloud SQL)
Cache+Queue:     Redis 7 (GCP Memorystore)
Job queue:       BullMQ 5.x
State machine:   XState 5.x
Validation:      Zod 3.x (never class-validator alone)
Auth:            JWT (jsonwebtoken 9.x) + passwordless magic link
Logging:         Pino 9.x structured JSON
HTTP server:     NestJS platform-express
Testing:         Jest 29.x + Supertest 7.x
```

### AI Stack (GCP only — no Azure, no OpenAI direct)
```
LLM:             Google Vertex AI Gemini 1.5 Flash
SDK:             @google-cloud/vertexai
Embeddings:      text-embedding-004 (Vertex AI)
Evals:           Custom eval runner (packages/ai/src/evals)
Auth:            GCP service account (GOOGLE_APPLICATION_CREDENTIALS local)
                 Attached service account (Cloud Run production — no credentials file)
```

### Frontend
```
Framework:       Next.js 14.2 App Router
Language:        TypeScript 5.4+ strict mode always
Styling:         Tailwind CSS 3.4
Components:      shadcn/ui primitives + custom design system
State:           Zustand 4.5 (client state)
Server state:    TanStack Query 5.x
Realtime:        Socket.IO client 4.7
Charts:          Recharts 2.x
Animation:       Framer Motion 11.x (dashboard only — not marketing site)
Icons:           Lucide React 0.383
Fonts:           DM Sans (body) + DM Serif Display (headlines)
Mono font:       JetBrains Mono (IDs, code, technical values)
```

### Communications
```
SMS + Voice:     Twilio
Email:           Resend (resend.com — no AWS dependency)
Booking:         Cal.com API
Realtime:        Socket.IO + Redis pub/sub
```

### Infrastructure — GCP ONLY (no AWS, no Azure)
```
API service:     GCP Cloud Run        ~$35/month
Worker service:  GCP Cloud Run        ~$10/month
Database:        GCP Cloud SQL PG16   ~$10/month
Redis:           GCP Memorystore      ~$25/month
CI/CD:           GCP Cloud Build      ~$5/month
Registry:        GCP Artifact Registry~$2/month
Secrets:         GCP Secret Manager   ~$1/month
Frontends:       Vercel free tier     $0
Email:           Resend free tier     $0 (3K emails/month)
Total:                                ~$88/month
```

### Local Development
```
Postgres + Redis: Docker (infra/docker/docker-compose.yml)
All apps:         pnpm dev (runs all via pnpm -r)
DATABASE_URL:     postgresql://conversionops:password@localhost:5432/conversionops
REDIS_URL:        redis://localhost:6379
```

---

## SECTION 4 — DATABASE CONTRACT

### The 20 Models
```
Core:         Workspace, User, WorkspaceUser
Leads:        Lead, LeadAssignment, LeadEvent
Conversations:Conversation, Message
Bookings:     Appointment
Workflows:    WorkflowExecution, WorkflowEvent
Compliance:   ConsentRecord
AI:           AIUsageRecord, AIEvalResult
Routing:      RoutingRule
Comms:        Notification
Platform:     IdempotencyKey, AuditLog, FeatureFlagOverride, OperationalMetric
```

### Non-Negotiable Field Rules
Every model MUST have ALL of these:
```prisma
workspaceId  String    // tenant boundary — every model except Workspace and User
createdAt    DateTime  @default(now())
updatedAt    DateTime  @updatedAt
deletedAt    DateTime? // soft delete — NEVER hard delete business records
```

### Non-Negotiable Index Rules
Every model MUST have at minimum:
```prisma
@@index([workspaceId, createdAt])
@@index([workspaceId, status])  // only if model has a status field
```

### JSON Fields — Strict Policy
```
USE JSON FOR:   aiMetadata, qualification, sourcePayload, aiConfig,
                featureFlags, routingConditions, providerPayload, stateSnapshot
NEVER JSON FOR: anything you filter, sort, aggregate, join, or query by
                (use typed columns for operational fields)
```

### Lead Status Machine — XState Enforced
```
NEW → CONTACTED → QUALIFYING → QUALIFIED → ROUTING → ASSIGNED
    → APPOINTMENT_REQUESTED → APPOINTMENT_SCHEDULED → CONVERTED

Dormancy path:
NEW → UNRESPONSIVE → DORMANT ↔ REACTIVATED

Terminal states (no exit):
OPT_OUT, DISQUALIFIED, CONVERTED
```
**ABSOLUTE RULE:** `lead.status` is ONLY updated through the XState machine in
`packages/orchestration/src/workflows/lead-lifecycle.workflow.ts`.
Never set `lead.status` directly from a service, handler, or processor.

---

## SECTION 5 — BACKEND ARCHITECTURE RULES

### CQRS Pattern — Mandatory in Every NestJS Module
```
modules/[domain]/
├── [domain].module.ts       NestJS module registration
├── [domain].controller.ts   HTTP layer ONLY — delegates to handlers, no business logic
├── [domain].service.ts      Orchestration ONLY — no Prisma calls directly here
├── commands/
│   ├── [action].command.ts  Data class: intent + payload, no return type needed
│   └── [action].handler.ts  Writes DB, enqueues jobs, emits events, returns Result<T>
└── queries/
    ├── get-[x].query.ts     Data class: filter params
    └── get-[x].handler.ts   Reads ONLY, returns DTOs, raw SQL allowed and encouraged
```

**Rules enforced by code review:**
- Controllers call commands for POST / PATCH / DELETE
- Controllers call queries for GET
- Command handlers NEVER call query handlers
- Query handlers NEVER mutate state
- Repositories called by handlers only — never by controllers

### Tenant Isolation — Zero Tolerance Policy
```typescript
// THIS IS A CRITICAL SECURITY BUG — never do this:
const lead = await prisma.lead.findUnique({ where: { id } });

// CORRECT — always scope every query:
const lead = await prisma.lead.findUnique({
  where: { id, workspaceId: ctx.workspaceId }
});
// Returns null if wrong workspace → HTTP layer maps to 404
// NEVER return 403 — never confirm a resource exists cross-tenant
```

### Idempotency — Required on All External Webhooks
```typescript
// Key format by source:
`twilio:sms:${body.MessageSid}`          // Twilio inbound SMS
`twilio:voice:${body.CallSid}`           // Twilio voice/missed call
`stripe:${event.id}`                     // Stripe webhook events
`calcom:booking:${payload.uid}`          // Cal.com booking webhook
`crm:fub:${operation}:${leadId}`         // CRM sync operations
```
Check `IdempotencyKey` table FIRST before any processing. Return cached result
if found. Mark PROCESSING before starting. Mark COMPLETED or FAILED on finish.

### Result Type — Required Across Package Boundaries
```typescript
import { ok, err, Result } from '@conversionops/sdk-standards';

// Always return Result<T> — never throw across package boundaries
async function createLead(cmd: CreateLeadCommand): Promise<Result<Lead>> {
  try {
    const lead = await repo.create(cmd);
    return ok(lead);
  } catch (e) {
    return err(new LeadCreationError(String(e)));
  }
}
```

### API Error Shape — Exact Format, Never Deviate
```json
{
  "statusCode": 404,
  "error": "NOT_FOUND",
  "message": "Lead not found",
  "requestId": "req_abc123",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### RBAC — Roles and What They Can Do
```
OWNER  → everything: billing, deletion, all features, all agents
ADMIN  → everything except billing and workspace deletion
AGENT  → own conversations + leads assigned to them only
VIEWER → read-only: dashboard, analytics, conversations (no mutations)
```
Every route decorated with `@UseGuards(AuthGuard, RbacGuard)` and
`@RequirePermission('resource:action')`. No exceptions.

### Audit Logging — What Gets Logged
```
LOG THESE (consequential actions visible to users):
  lead created / assigned / converted / deleted
  conversation takeover / release / escalation
  agent invited / suspended / removed
  workspace AI paused / resumed
  routing rule created / modified / deleted
  billing plan changed
  security: tenant leakage attempt

DO NOT LOG: reads, health checks, metrics writes, cache operations
METHOD: always async via BullMQ audit-log queue — never synchronously
```

### Response Performance Targets
```
Twilio webhook acknowledgement:   < 200ms   (Twilio retries after 15s)
Dashboard API reads:              < 300ms p95
AI message generation:            < 5000ms  (async via queue — never blocks HTTP)
Realtime event delivery:          < 100ms after queue processing
```

---

## SECTION 6 — COMPLIANCE INVARIANTS

**These are laws, not guidelines. They cannot be feature-flagged off.
They cannot be bypassed. If any check fails, throw the appropriate
error class and halt all processing.**

### TCPA — SMS Legal Compliance
```
RULE 1: Never send any SMS without ConsentRecord where status = 'OPTED_IN'
RULE 2: Never send SMS between 9:00pm and 8:00am in RECIPIENT'S local timezone
RULE 3: Never send SMS after receiving any of: STOP, STOPALL, UNSUBSCRIBE,
        CANCEL, END, QUIT — in any combination of case
RULE 4: Opt-out keyword detection happens BEFORE AI processing starts
RULE 5: Consent must exist in ConsentRecord before the very first outbound SMS
RULE 6: On opt-out, immediately update ConsentRecord.status = 'OPTED_OUT'
        and cease all AI conversation processing for that phone number
```

### Fair Housing Act — Real Estate Compliance
```
Every AI-generated message that references a property, neighborhood, or area
MUST pass checkFairHousing() from packages/compliance/src/fair-housing/index.ts
BEFORE being sent. Store result in aiMetadata.fairHousingChecked = true.
```

### CCPA — California Privacy Compliance
```
- Privacy policy linked from every data-collecting page
- Data deletion requests processed within 30 days (use PII anonymisation, not deletion)
- Data export available for any phone number on written request
- piiDeletedAt timestamp set on Lead when PII anonymised
- Content of Message records replaced with '[PII DELETED]' on anonymisation
```

### Data Retention Schedule
```
Conversation transcripts:  minimum 2 years (real estate record requirements)
Audit logs:                minimum 7 years (legal requirement — never purge)
Analytics events:          1 year
Idempotency records:       24 hours (nightly purge cron at 3am UTC)
PII after opt-out:         30 days then anonymise
Session tokens:            30 days
```

---

## SECTION 7 — AI SYSTEM RULES

### Pre-Generation Checklist — Execute in This Exact Order
```typescript
// 1. Check workspace-level and conversation-level AI pause
const allowed = await humanOverride.isAIAllowed(conversationId, workspaceId);
if (!allowed) return handoffToAgent(conversationId);

// 2. Check TCPA opt-out (before any AI processing)
if (isOptOutKeyword(inboundMessage)) {
  await tcpa.processOptOut(phone, workspaceId);
  return; // halt all processing
}

// 3. Check TCPA quiet hours
if (isQuietHours(workspace.timezone)) {
  await queue.scheduleAfterQuietHours(job);
  return;
}

// 4. Check token quota
const quota = await governance.checkQuota(workspaceId);
if (!quota.allowed) {
  await notifications.alertQuotaExceeded(workspaceId);
  return handoffToAgent(conversationId);
}

// 5. Generate AI response
const { content, metadata } = await ai.generate(context);

// 6. Check fair housing on generated content
const fhCheck = checkFairHousing(content);
if (!fhCheck.passed) {
  await escalate(conversationId, 'FLAGGED', 'Fair housing filter triggered');
  return;
}

// 7. Send — only reaches here if all checks pass
await twilio.sendSMS({ to: phone, body: content });
```

### AI Message Metadata — Required on Every AI Message
```typescript
// Stored in Message.aiMetadata (Json field)
interface AIMessageMetadata {
  promptVersion:    string;   // 'qualification-v2.3.1'
  promptHash:       string;   // SHA-256 of prompt template at generation time
  modelVersion:     string;   // 'gemini-1.5-flash-001'
  chainVersion:     string;   // 'qualification-chain-v1.2.0'
  policyVersion:    string;   // 'fair-housing-policy-v1.0.0'
  inputTokens:      number;
  outputTokens:     number;
  latencyMs:        number;
  temperature:      number;
  tcpaChecked:      boolean;  // always true if message was sent
  fairHousingChecked: boolean; // always true if message was sent
  quietHoursApplied: boolean;
  evalScores?: {              // populated async after generation
    relevance?:              number; // 0-1
    hallucination?:          number; // 0-1 (higher = worse)
    bookingIntent?:          number; // 0-1
    qualificationProgress?:  number; // 0-1
  };
}
```

### Token Quotas
```
SOLO plan:        2,000,000 tokens/month
BROKERAGE plan:  10,000,000 tokens/month
ENTERPRISE:       workspace.tokenQuotaMonthly (custom)

Alert owner at 80% usage.
Hard stop at 100% — graceful handoff to agent, never silent failure.
```

### Escalation Triggers — AI Must Stop and Alert Human
```typescript
const ESCALATION_PATTERNS = [
  { pattern: /lawyer|attorney|sue|legal action/i,   level: 'URGENT',    reason: 'Legal threat' },
  { pattern: /discrimination|racist|bias/i,          level: 'URGENT',    reason: 'Discrimination complaint' },
  { pattern: /complaint|manager|supervisor/i,        level: 'ESCALATED', reason: 'Escalation request' },
  { pattern: /refund|chargeback/i,                   level: 'ESCALATED', reason: 'Financial dispute' },
];
// Also escalate if 3+ consecutive turns with zero qualification progress
```

### Conversation Memory Strategy
```
Messages 1-12:   Send full conversation history to AI
Messages 13+:    Send conversation.contextSummary + last 12 messages only
Trigger summary: When message count exceeds 20 — generate summary via AI,
                 store in conversation.contextSummary, set summarisedUpTo = lastMessageId
Hard limit:      Never exceed 3,000 input tokens — summarise aggressively
```

---

## SECTION 8 — FRONTEND DESIGN SYSTEM

### Design Philosophy
Premium. Operational. Calming. Trustworthy. Fast.
The experience should feel like operating a piece of infrastructure you trust
completely — like Stripe's dashboard, Linear's interface, Apple's apps.

**NEVER FEEL LIKE:** AI chatbot software, generic SaaS template, freelancer build,
CRM clone, crypto dashboard, Salesforce complexity, Material Design.

### Typography — Three Fonts, Used Precisely
```css
/* Body, UI, labels, numbers, buttons — everything default */
font-family: 'DM Sans', -apple-system, sans-serif;

/* Headlines, hero text, large display numbers, section titles */
font-family: 'DM Serif Display', Georgia, serif;

/* IDs, codes, technical values, timestamps, metrics */
font-family: 'JetBrains Mono', 'Courier New', monospace;
```

### Type Scale
```
11px  — micro label, uppercase tracking
12px  — caption, hint, timestamp
13px  — body small, table cell, secondary label
14px  — body default, button, form label
15px  — body large
16px  — subtitle
20px  — heading small
24px  — heading medium
32px  — heading large
48px  — display small (section heroes)
64px  — display medium (page heroes)
88px  — display large (marketing hero headline)
```

### Color System — Dark Theme Throughout
```css
:root {
  /* === BACKGROUNDS === */
  --bg:             #0a0a0b;    /* page background */
  --bg-2:           #111114;    /* card, panel background */
  --bg-3:           #18181d;    /* input, code block, nested panel */
  --bg-4:           #1e1e24;    /* hover state on bg-2 */

  /* === BORDERS === */
  --border:         rgba(255,255,255,0.07);   /* default border */
  --border-light:   rgba(255,255,255,0.12);   /* emphasized border */
  --border-focus:   rgba(232,255,71,0.4);     /* focused input border */

  /* === TEXT === */
  --text:           #f4f4f5;    /* primary — headings, important content */
  --text-2:         #a1a1aa;    /* secondary — body text, descriptions */
  --text-3:         #71717a;    /* tertiary — placeholders, hints, disabled */
  --text-4:         #52525b;    /* quaternary — very muted */

  /* === ACCENT (primary brand color) === */
  --accent:         #e8ff47;    /* primary CTA, active nav, key highlights */
  --accent-hover:   #f0ff6a;    /* accent on hover */
  --accent-dim:     rgba(232,255,71,0.12);
  --accent-dim-2:   rgba(232,255,71,0.06);

  /* === STATUS COLORS === */
  --green:          #47ff8e;    /* success, live, active, connected */
  --green-dim:      rgba(71,255,142,0.10);
  --red:            #ff4747;    /* error, urgent, danger, destructive */
  --red-dim:        rgba(255,71,71,0.10);
  --blue:           #4796ff;    /* info, links, secondary actions */
  --blue-dim:       rgba(71,150,255,0.10);
  --amber:          #ffb347;    /* warning, pending, in-progress */
  --amber-dim:      rgba(255,179,71,0.10);
  --purple:         #a78bfa;    /* AI-generated content indicator */
  --purple-dim:     rgba(167,139,250,0.10);
}
```

### Spacing System — 4px Base Grid
```
4px   — micro: icon-to-label, tight inline gaps
8px   — xs: related element groups
12px  — sm: list item gaps, form field gaps
16px  — md: compact card padding, section content gaps
20px  — lg: standard inner padding
24px  — xl: standard card padding
32px  — 2xl: section separation within page
48px  — 3xl: major section separation
64px  — 4xl: page-level breathing room
80px  — 5xl: marketing section padding top/bottom
120px — 6xl: large marketing section gaps
```

### Border Radius
```
2px  — sharp accent element
4px  — badge, tag, small chip
6px  — button (small), input (compact)
8px  — button (default), input (default), small card
10px — standard card
12px — modal, drawer, tooltip
16px — large card, panel
20px — section container
24px — hero card, featured section
```

### Shadow System
```css
--shadow-sm:  0 1px 3px rgba(0,0,0,0.4);
--shadow-md:  0 4px 16px rgba(0,0,0,0.5);
--shadow-lg:  0 8px 32px rgba(0,0,0,0.6);
--shadow-accent: 0 8px 32px rgba(232,255,71,0.2);
--shadow-glow:   0 0 60px rgba(232,255,71,0.08);
```

### Animation System — Framer Motion Tokens
```typescript
// Dashboard app only (not marketing site)
export const motion = {
  // Standard entrance
  fadeUp: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -8 },
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
  },
  // Subtle entrance for list items
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  // Modal / drawer entrance
  scaleIn: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
  },
  // Side panel entrance
  slideRight: {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  },
  // Hover on interactive card
  hoverLift: { y: -2, transition: { duration: 0.15, ease: 'easeOut' } },
  // Button press
  press: { scale: 0.97, transition: { duration: 0.1 } },
};

// Stagger children (list items entering one by one)
export const stagger = {
  container: { transition: { staggerChildren: 0.05 } },
  item: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  }
};

// Marketing site: CSS animations only (no Framer Motion — keep bundle tiny)
```

### Component Requirements — Every Component Must
```
1. Accessible: WCAG 2.1 AA — keyboard nav, ARIA labels, visible focus rings
2. Loading state: Skeleton shimmer (not spinner) where content is expected
3. Empty state: Meaningful illustration + clear CTA, never just "No data"
4. Error state: Clear error message + retry action + support link
5. Responsive: Mobile-first, minimum 375px viewport, works on 768px tablet
6. Performance: No layout shift, images have explicit dimensions
```

### Dashboard Layout — Exact Measurements
```
Topbar:     height 64px, fixed, backdrop-blur-xl, border-bottom var(--border)
Sidebar:    width 240px, fixed left, full height, border-right var(--border)
Content:    flex-1, overflow-y auto, padding 32px, max-width 1280px centered
Mobile:     sidebar collapses to bottom navigation at < 768px
```

### Sidebar Navigation Order
```
Overview          /                    (all roles)
Conversations     /conversations       (all roles)
Leads             /leads               (all roles)
Appointments      /appointments        (all roles)
Analytics         /analytics           (VIEWER+)
─────────────────────────────────────────────────
Routing           /routing             (ADMIN+ only)
Agents            /agents              (ADMIN+ only)
Integrations      /integrations        (ADMIN+ only)
─────────────────────────────────────────────────
Settings          /settings/workspace  (all roles — limited by role)
```

### Key UI Component Specifications

**ConversationThread:**
```
AI messages:    left-aligned, bg-2 background, purple-dim left border (2px)
Human messages: right-aligned, accent-dim background, accent left border
System notes:   centered, text-3 color, text-11px, italic
Typing indicator: three dots bouncing, bg-3 background
Real-time: Socket.IO subscription — message appears with fadeIn animation
Takeover button: fixed top-right of thread, always visible, accent color
Lead score: always visible top of thread, color-coded ring
```

**LeadCard (pipeline view):**
```
Score ring: circular progress 0-100, green >79, amber 30-79, red <30
Status pill: color matches status (green=active, amber=pending, red=urgent)
Source icon: Zillow Z, phone icon for missed call, globe for web
Time display: relative ("2 min ago") — absolute on hover tooltip
Qualification bar: linear progress showing qual completion %
Agent avatar: 24px circle, initials if no photo
```

**MetricCard (analytics):**
```
Number: DM Serif Display 40px, var(--text)
Trend: up/down arrow + % change vs prior period (green up, red down)
Sparkline: 28px height, 7-day trend, accent color line
Hover: accent glow shadow, subtle y:-2 lift
```

**DataTable:**
```
Header: sticky, bg-3 background, text-3 color, 12px uppercase
Row hover: bg-2 to bg-3 transition 150ms
Sort: chevron icon, accent color when active
Pagination: cursor-based (no page numbers for large datasets)
Selection: checkbox column, bulk action toolbar appears on selection
Empty: centered illustration + CTA, min-height 200px
```

### Onboarding Flow Design
```
Layout: Full viewport, no sidebar, single column centered, max-width 520px
Progress: Minimal dot indicator top-center (step X of 6)
Animation: Slide + fade 200ms between steps (next slides from right, back from left)
Each step: ONE primary action, ONE secondary (skip or back)
Feel: Premium, calm, guided — like setting up a new MacBook

Step 1: Workspace name + timezone (DM Serif Display headline: "Let's set up your workspace")
Step 2: Connect Twilio phone (show phone number provisioning live)
Step 3: Connect CRM — Follow Up Boss (show connection status, skip option)
Step 4: Configure AI persona (name + tone — preview of first message live updates)
Step 5: Test lead simulator (fire a test lead, watch the AI respond in real-time)
Step 6: Celebration (animated confetti, "You're live" headline, go to dashboard CTA)
```

### Marketing Site (apps/web) Design Specs
```
Same dark color system as dashboard (brand consistency, not typical light marketing site)
Noise texture overlay on hero: SVG filter, 3-4% opacity, adds premium tactility
Section order: Hero → PainPoints → LiveDemo → Features → Pricing → CTA → Footer

Hero:
  Headline: DM Serif Display italic, 88px desktop / 48px mobile
  Subheadline: DM Sans 400 20px, var(--text-2)
  Badge: "Now live in Miami, Orlando, Tampa, San Diego" with pulse dot
  CTA: accent button "See it live in 60 seconds" + ghost "View pricing"
  Stats bar: 4 metrics (60s response, 3x appointments, 78% first-responder rule, $0 staff)

Interactive Demo section:
  NO SIGNUP REQUIRED — works immediately on page load
  Split panel: left=lead form, right=live AI conversation
  Timer shows seconds until AI responds
  Lead score updates in real-time as conversation progresses
  Booking confirmation fires at end of demo

Animations: CSS only (no Framer Motion — LCP must be < 2.5s, CLS < 0.1)
```

---

## SECTION 9 — QUEUE ARCHITECTURE

### The 12 Queues
```
lead-intake           Entry point for all new leads from any source
ai-response           Generate + send AI message (TCPA check first always)
qualification         Run 7-question qualification chain on each reply
lead-routing          Match scored lead to optimal agent via routing rules
appointment-booking   Send Cal.com booking link + confirm appointment
crm-sync              Sync to Follow Up Boss / Zapier (withRetry wrapper)
missed-call           Fire SMS text-back within 8 seconds of missed call
reactivation          Dormant lead revival campaign management
notification          Agent alerts (hot lead, escalation, booking confirmation)
analytics-ingest      Record funnel events for analytics queries
audit-log             Async audit log writes (never block HTTP requests)
retention             Nightly cron 3am UTC — data purge policies
```

### Lead Intake Flow — End-to-End (Phase 5 milestone)
```
POST /v1/webhooks/twilio/sms
  ↓ validate Twilio signature (X-Twilio-Signature header — reject if invalid)
  ↓ check IdempotencyKey (key: `twilio:sms:${MessageSid}`)
  ↓ check ConsentRecord (status must be OPTED_IN — reject if not)
  ↓ check isOptOutKeyword(body) — process opt-out if true
  ↓ enqueue lead-intake job
  ↓ return 200 <Response/> immediately (Twilio needs < 5s or retries)

lead-intake processor:
  ↓ create Lead (status: NEW, source: SMS_INBOUND)
  ↓ append LeadEvent (lead.created, sequence: 1)
  ↓ enqueue ai-response job
  ↓ enqueue analytics-ingest job

ai-response processor:
  ↓ isAIAllowed() — halt if paused
  ↓ isQuietHours() — schedule for later if in quiet hours
  ↓ checkTokenQuota() — handoff to agent if exceeded
  ↓ buildContext() via ConversationMemoryManager
  ↓ generate response via Vertex AI Gemini 1.5 Flash
  ↓ checkFairHousing() on generated content — escalate if triggered
  ↓ save Message with complete AIMessageMetadata
  ↓ send SMS via Twilio
  ↓ update lead.status via XState machine (NEW → CONTACTED)
  ↓ append LeadEvent (lead.contacted)
  ↓ enqueue qualification job
  ↓ enqueue audit-log job
  ↓ emit Socket.IO event to workspace room (message:new)
```

---

## SECTION 10 — API ROUTES

```
# Auth (no auth required)
POST   /v1/auth/magic-link              Send magic link email
POST   /v1/auth/verify                  Verify token → return JWT

# Workspace (OWNER/ADMIN)
GET    /v1/workspaces/me                Current workspace + config
PATCH  /v1/workspaces/me                Update workspace settings
GET    /v1/workspaces/me/health          Operational health summary
PATCH  /v1/workspaces/me/ai-config      Update AI agent configuration
POST   /v1/workspaces/me/ai/pause       Pause AI for entire workspace
POST   /v1/workspaces/me/ai/resume      Resume AI for workspace

# Leads (AGENT+)
GET    /v1/leads                         Paginated list (cursor-based)
POST   /v1/leads                         Manual lead creation
GET    /v1/leads/:id                     Lead detail + event timeline
PATCH  /v1/leads/:id                     Update lead fields
POST   /v1/leads/:id/assign              Assign to specific agent
POST   /v1/leads/:id/reactivate          Trigger reactivation workflow

# Conversations (AGENT+)
GET    /v1/conversations                 Paginated inbox (cursor-based)
GET    /v1/conversations/:id             Thread + all messages
POST   /v1/conversations/:id/takeover    Agent takes over from AI
POST   /v1/conversations/:id/release     Release back to AI control
POST   /v1/conversations/:id/message     Send manual agent message
POST   /v1/conversations/:id/escalate    Manual escalation

# Appointments (AGENT+)
GET    /v1/appointments                  List with filters
PATCH  /v1/appointments/:id              Update status/notes

# Agents (ADMIN+)
GET    /v1/agents                        All workspace users
POST   /v1/agents/invite                 Invite new agent (sends magic link)
PATCH  /v1/agents/:id                    Update agent settings/availability
DELETE /v1/agents/:id                    Remove agent (soft delete)

# Analytics (VIEWER+)
GET    /v1/analytics/funnel              Conversion funnel data
GET    /v1/analytics/response-times      Response time distribution
GET    /v1/analytics/lead-sources        Source performance breakdown

# Routing (ADMIN+)
GET    /v1/routing-rules                 All routing rules (ordered by priority)
POST   /v1/routing-rules                 Create rule
PATCH  /v1/routing-rules/:id             Update rule
DELETE /v1/routing-rules/:id             Delete rule

# Billing (OWNER only)
POST   /v1/billing/checkout              Create Stripe checkout session
POST   /v1/billing/portal               Create Stripe customer portal session

# Webhooks (no auth — validated by provider signature)
POST   /v1/webhooks/twilio/sms          Inbound SMS → lead intake
POST   /v1/webhooks/twilio/voice         Missed call → text-back
POST   /v1/webhooks/stripe               Stripe subscription events
POST   /v1/webhooks/calcom               Booking confirmed/cancelled
POST   /v1/webhooks/zillow               Zillow lead notification
POST   /v1/webhooks/lead                 Generic lead intake (any source)
```

---

## SECTION 11 — BUSINESS LOGIC

### Lead Scoring Algorithm (0-100)
```typescript
// packages/ai/src/scoring/lead-scorer.ts
function calculateScore(qualification: QualificationData): number {
  let score = 0;

  // Timeline (30 points max)
  const timelinePoints = {
    '30_days':  30,
    '90_days':  20,
    '6_months': 10,
    'browsing':  0,
  };
  score += timelinePoints[qualification.timeline] ?? 0;

  // Financing status (25 points max)
  const financingPoints = {
    'pre_approved':      25,
    'cash':              25,
    'needs_financing':   10,
    'unknown':            0,
  };
  score += financingPoints[qualification.financingStatus] ?? 0;

  // Budget (20 points max)
  if (qualification.budget?.max > 500000)      score += 20;
  else if (qualification.budget?.max > 300000) score += 15;
  else if (qualification.budget?.max > 100000) score += 8;
  else                                          score += 3;

  // Urgency (15 points max)
  const urgencyPoints = {
    'immediate':  15,
    'near_term':   8,
    'browsing':    0,
  };
  score += urgencyPoints[qualification.urgency] ?? 0;

  // Engagement (10 points max — derived from conversation)
  score += Math.min(qualification.engagementScore ?? 0, 10);

  return Math.min(score, 100);
}

// Tier assignment
function getTier(score: number): LeadTier {
  if (score >= 80) return 'PRIORITY';
  if (score >= 60) return 'HOT';
  if (score >= 30) return 'WARM';
  return 'COLD';
}
```

### Routing Priority (evaluated in order)
```
1. LANGUAGE match — always prioritise language-matching agent first
2. GEOGRAPHY match — agent serviceAreas contains lead area
3. AVAILABILITY — agent.isAvailable = true and not past unavailableUntil
4. PERFORMANCE — highest conversionRate among available matching agents
5. ROUND_ROBIN — fallback if all else equal or no preferences match
```

### Missed Call Flow (8-second SLA)
```
Twilio voice webhook received
→ validate signature
→ check IdempotencyKey
→ check ConsentRecord (OPTED_IN required)
→ enqueue missed-call job with HIGHEST priority

missed-call processor (fires within 8 seconds target):
→ send SMS: "Hi! You just called [AgentName]'s office.
             This is their AI assistant — are you looking
             to buy or sell in [area]? I can help right now."
→ create Lead (source: MISSED_CALL, status: NEW)
→ create Conversation (channel: SMS)
→ enqueue lead-intake to continue normal AI flow
→ emit notification to agent: "Missed call recovered — [phone]"
```

---

## SECTION 12 — ERROR CLASSES

```typescript
// packages/sdk-standards/src/errors.ts — complete hierarchy

ConversionOpsError           // base — all errors extend this
  WorkspaceNotFoundError     // WORKSPACE_NOT_FOUND
  TenantLeakageError         // TENANT_LEAKAGE → always 404 in HTTP (never 403)
  AIQuotaExceededError       // AI_QUOTA_EXCEEDED
  TCPAViolationError         // TCPA_VIOLATION
  IdempotencyConflictError   // IDEMPOTENCY_CONFLICT → HTTP 202 (processing)
  LeadNotFoundError          // LEAD_NOT_FOUND
  ConversationNotFoundError  // CONVERSATION_NOT_FOUND
  UnauthorizedError          // UNAUTHORIZED → HTTP 401
  ForbiddenError             // FORBIDDEN → HTTP 403
  ValidationError            // VALIDATION_ERROR → HTTP 422
  ExternalServiceError       // EXTERNAL_SERVICE_ERROR (Twilio, Vertex AI, etc.)
```

**TenantLeakageError special handling:**
```
HTTP response: 404 (never confirm resource exists cross-tenant)
Log level: ERROR with full context
Audit log: action = 'security.tenant_leakage_attempt'
Alert: ops notification if > 3 in 5 minutes from same user
```

---

## SECTION 13 — TESTING STANDARDS

### Required Coverage Per Feature
```
1. Unit test    — handler/service isolated, all deps mocked
2. Integration  — full request → DB → response cycle
3. Isolation    — tenant boundary explicitly verified
```

### Mandatory Isolation Tests
```typescript
// These MUST exist and MUST pass before any multi-tenant feature ships:
it('workspace B cannot read workspace A leads — returns 404')
it('workspace B cannot update workspace A leads — returns 404')
it('workspace B conversation list returns empty array not 403')
it('workspace B Socket.IO receives zero workspace A events')
it('workspace B cannot read workspace A cached Redis data')
it('AGENT role cannot access billing endpoints — returns 403')
it('VIEWER role cannot send messages — returns 403')
it('OWNER of workspace A cannot modify workspace B — returns 404')
```

### Test Naming Convention
```typescript
describe('[ModuleName] [ClassName]', () => {
  describe('[methodName]', () => {
    it('should [expected behaviour] when [condition]')
    it('should return 404 when lead belongs to different workspace')
    it('should throw TCPAViolationError when phone number is opted out')
    it('should queue audit log entry when lead is assigned')
  });
});
```

---

## SECTION 14 — ENVIRONMENT VARIABLES

```bash
# ── Core ─────────────────────────────────────────
NODE_ENV=development
DATABASE_URL=postgresql://conversionops:password@localhost:5432/conversionops
REDIS_URL=redis://localhost:6379

# ── Google Cloud (ALL infra — GCP only, no AWS, no Azure) ──
GOOGLE_CLOUD_PROJECT=conversionops-prod
GOOGLE_CLOUD_REGION=us-central1
VERTEX_AI_MODEL=gemini-1.5-flash-001
# Local dev: path to service account JSON downloaded from GCP Console
# Production Cloud Run: leave empty — uses attached service account automatically
GOOGLE_APPLICATION_CREDENTIALS=

# ── Twilio ───────────────────────────────────────
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# ── Stripe ───────────────────────────────────────
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_SOLO_PRICE_ID=
STRIPE_BROKERAGE_PRICE_ID=
STRIPE_ENTERPRISE_PRICE_ID=

# ── Email (Resend — not AWS SES) ─────────────────
RESEND_API_KEY=
RESEND_FROM_EMAIL=hello@conversionops.in

# ── Cal.com ──────────────────────────────────────
CALCOM_API_KEY=

# ── CRM ──────────────────────────────────────────
FOLLOW_UP_BOSS_API_KEY=

# ── Auth ─────────────────────────────────────────
JWT_SECRET=                    # minimum 64 random characters
JWT_EXPIRY=7d
MAGIC_LINK_SECRET=             # minimum 64 random characters
MAGIC_LINK_EXPIRY=15m

# ── App URLs ─────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://app.conversionops.in
NEXT_PUBLIC_API_URL=https://api.conversionops.in
NEXT_PUBLIC_WS_URL=wss://api.conversionops.in
PORT=3001
LOG_LEVEL=info
WORKER_CONCURRENCY=5
```

---

## SECTION 15 — CODE STANDARDS

### TypeScript — Strict Mode, Zero Exceptions
```typescript
// NEVER:
const x: any = something;           // use unknown + type guard
const y = obj!.property;            // handle null explicitly
// @ts-ignore                        // fix the type error
console.log('debug');               // use logger from @conversionops/observability
var z = 5;                          // use const or let

// ALWAYS:
const result: Result<Lead> = await createLead(cmd);
if (!result.ok) { /* handle */ }
const value = result.value;         // only access after checking ok
```

### Naming Conventions
```
Files (NestJS):       kebab-case.type.ts      create-lead.handler.ts
Files (React):        PascalCase.tsx           LeadCard.tsx
Classes:              PascalCase               CreateLeadHandler
Interfaces:           PascalCase               ILeadRepository
Types:                PascalCase               LeadStatus
Prisma enums:         PascalCase values        UserRole.ADMIN (not 'ADMIN' string)
Constants:            SCREAMING_SNAKE          QUEUE_NAMES.LEAD_INTAKE
Functions:            camelCase                createLead
Variables:            camelCase                workspaceId
CSS variables:        --kebab-case             --accent-dim
Tailwind classes:     use design system tokens not arbitrary values
```

### Import Order
```typescript
// 1. Node built-ins
import { createHash } from 'crypto';
import path from 'path';

// 2. External packages
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

// 3. Internal monorepo packages
import { prisma } from '@conversionops/db';
import { TCPAViolationError } from '@conversionops/sdk-standards';

// 4. Relative imports (current app/package)
import { CreateLeadCommand } from './create-lead.command';
import type { LeadDTO } from '../types';
```

### JSDoc Requirements
```typescript
/**
 * Creates a new lead from an inbound webhook payload.
 * Checks idempotency before creating to prevent duplicates.
 *
 * @param command - The create lead command with source + contact details
 * @returns Result<Lead> — ok with the created lead, or err with typed error
 * @throws Never — errors are returned as Result<T, E>, not thrown
 */
async execute(command: CreateLeadCommand): Promise<Result<Lead>> { ... }
```

---

## SECTION 16 — BUILD PHASES

### Phase 1 — COMPLETE ✓
Prisma schema: 20 models, 21 enums, 87+ composite indexes
Migration applied: `20260518104338_init`
Seed data: demo-brokerage workspace confirmed working
File: `packages/db/prisma/schema.prisma`

---

### Phase 2 — NestJS API Skeleton [CURRENT PHASE]
Build in this exact order. Type-check after each file.

```
apps/api/src/modules/prisma/
  prisma.module.ts          Global NestJS module wrapping PrismaService
  prisma.service.ts         Extends PrismaClient, OnModuleInit, enableShutdownHooks

apps/api/src/common/
  filters/
    http-exception.filter.ts  Global filter: maps all errors to standard shape
  decorators/
    user.decorator.ts         @CurrentUser() — extracts User from request
    workspace.decorator.ts    @CurrentWorkspace() — extracts Workspace from request
  pipes/
    zod-validation.pipe.ts    Global validation pipe using Zod schemas

apps/api/src/app.module.ts    Register: ConfigModule(global) + PrismaModule only
apps/api/src/main.ts          Bootstrap: helmet, compression, ValidationPipe,
                              global prefix 'v1', CORS for APP_URL

packages/auth/src/
  jwt.ts                    signToken(payload, secret, expiry) + verifyToken()
  magic-link.ts             generateMagicLink() + verifyMagicLink()

apps/api/src/modules/auth/
  auth.module.ts
  auth.controller.ts        POST /v1/auth/magic-link, POST /v1/auth/verify
  auth.service.ts
```

---

### Phase 3 — Tenancy + Security
```
apps/api/src/common/
  guards/
    auth.guard.ts           Validates JWT, attaches user + workspace to request
    rbac.guard.ts           Checks permission via @RequirePermission decorator
  middleware/
    tenant.middleware.ts    Resolves workspaceId from JWT, attaches to request
    audit-log.middleware.ts Queues audit log entry for every mutating request
  interceptors/
    audit.interceptor.ts    Response interceptor for audit completions

apps/api/src/modules/
  workspace/ (full CQRS)    GET /workspaces/me, PATCH /workspaces/me
  lead/      (full CQRS)    Full CRUD + assign + reactivate
  conversation/ (CQRS)      Inbox + thread + takeover + release
  agent/     (CQRS)         Invite + list + update + remove

apps/api/src/__tests__/isolation/
  tenant-isolation.spec.ts  All 8 mandatory isolation tests
  rbac-isolation.spec.ts    Role boundary tests
  websocket-isolation.spec.ts  Socket room isolation tests
```

---

### Phase 4 — Orchestration
```
packages/orchestration/src/
  queues/index.ts           All 12 BullMQ queue instances
  queues/connection.ts      Redis singleton connection
  events/event-store.ts     Append-only LeadEvent log (getHistory, replay)
  workflows/
    lead-lifecycle.workflow.ts  Complete XState machine all states + transitions
    reactivation.workflow.ts
  idempotency/
    idempotency.service.ts  acquire(), complete(), fail(), purgeExpired()
  notifications/
    notification.service.ts Dispatch: SMS alert, email, push

apps/worker/src/
  worker.module.ts          Register all Phase 4 processors
  processors/
    lead-intake.processor.ts
    lead-routing.processor.ts
    notification.processor.ts
    audit-log.processor.ts

apps/api/src/modules/routing/routing.module.ts
```

---

### Phase 5 — Twilio Intake Loop (First Production E2E)
```
packages/ai/src/
  client/index.ts           Vertex AI Gemini client wrapper (not Azure, not OpenAI)
  prompts/
    system.prompt.ts        Base system prompt builder
    response.prompt.ts      Initial lead response template
    qualification.prompt.ts 7-question qualification flow template
  chains/
    qualification.chain.ts  Multi-turn qualification orchestration
  scoring/
    lead-scorer.ts          0-100 scoring algorithm (see Section 11)
  governance/
    token-budget.ts         checkQuota(), trackUsage(), alertAt80Percent()
  memory/
    conversation-memory.ts  buildContext() with summarisation

packages/compliance/src/tcpa/index.ts  FINAL implementation (not stub)
packages/integrations/src/comms/twilio/index.ts  SMS send + receive

apps/api/src/webhooks/
  twilio/sms.webhook.ts     Full idempotent handler with TCPA checks
  twilio/voice.webhook.ts   Missed call text-back (8-second SLA)
  zillow/zillow.webhook.ts
  generic/generic-lead.webhook.ts

apps/worker/src/processors/
  ai-response.processor.ts      Full 7-step pre-send checklist
  qualification.processor.ts
  missed-call.processor.ts
```

---

### Phase 6 — Realtime
```
apps/api/src/gateway/
  realtime.gateway.ts       Socket.IO gateway + Redis pub/sub bridge
  workspace.rooms.ts        Tenant-isolated room management

apps/app/src/hooks/
  useRealtime.ts            Socket.IO client hook with auto-reconnect

Socket events emitted to workspace room:
  lead:created              New lead arrives
  lead:scored               Score updated after qualification step
  lead:assigned             Routed to agent
  message:new               New conversation message
  conversation:takeover     Agent or AI took over
  appointment:booked        Cal.com booking confirmed
  notification:new          Alert for agent
```

---

### Phase 7 — Dashboard Frontend + Marketing Site
```
Priority order for apps/app/:

1. Conversation inbox           Most-used screen — agents live here
   - Real-time message stream via useRealtime
   - AI/Human message differentiation (purple-dim vs accent-dim)
   - Lead score badge, escalation indicator, takeover button
   - Typing indicator with Socket.IO

2. Lead pipeline view           Kanban or list with filters
   - Score ring, tier badge, source icon, time ago
   - Click → lead detail with full event timeline

3. Onboarding 6-step flow       Critical for first client
   - Premium animated transitions, live AI preview in step 4-5

4. Settings pages               Workspace + AI config + billing

5. Analytics dashboard          Funnel chart, response times, source breakdown

6. Routing rules (ADMIN+)       Drag-to-reorder priority, visual rule builder

7. Agent management (ADMIN+)    Invite, suspend, performance metrics

For apps/web/:
1. Homepage (complete — all sections)
2. /demo (interactive, zero signup required, Miami agent scenario)
3. /pricing (three tier cards)
4. /book (Cal.com embed)
5. /legal (Termly.io embed)
```

---

### Phase 8 — AI Evals + Compliance
```
packages/ai/src/evals/
  scorers/
    relevance.scorer.ts         Is response relevant to lead's last message?
    hallucination.scorer.ts     Did AI make up facts about the property/market?
    booking-intent.scorer.ts    Correctly detected and handled booking intent?
    qualification.scorer.ts     Is qualification flow progressing correctly?
  runners/
    eval-runner.ts              Async scorer — runs after every AI message
    regression-runner.ts        CI gate — blocks deploy if score drops > 5%
  fixtures/
    qualification-cases.json    30+ test conversation fixtures
    edge-cases.json             Opt-out, legal threat, fair housing edge cases

packages/ai/src/guardrails/
  hallucination-guard.ts        Detect and flag factual claims about market/property

packages/compliance/src/
  ccpa/index.ts                 deletePII(), exportUserData() — final implementation
  retention/index.ts            enforceRetentionPolicies() cron logic

apps/worker/src/processors/
  retention.processor.ts        Nightly 3am UTC cron
```

---

### Phase 9 — CRM + Booking
```
packages/integrations/src/
  crm/
    follow-up-boss/
      client.ts     REST client with rate limiting
      sync.ts       upsertLead(), pushConversation(), pushQualification()
    zapier/
      webhook-relay.ts  Universal fallback for any CRM
  booking/
    cal-com/
      client.ts     sendBookingLink(), getAvailability()
      webhooks.ts   handleBookingConfirmed(), handleBookingCancelled()

apps/api/src/modules/appointment/   Full CQRS implementation
apps/api/src/webhooks/calcom/booking.webhook.ts  Idempotent (key: booking uid)

apps/worker/src/processors/
  crm-sync.processor.ts          withRetry(3 attempts, exponential backoff)
  appointment-booking.processor.ts
  reactivation.processor.ts      Dead lead revival workflow
```

---

### Phase 10 — Analytics + Ops Console
```
apps/api/src/modules/analytics/queries/
  get-funnel.handler.ts       Raw SQL — conversion funnel with date range
  get-response-times.handler.ts  Response time percentiles (p50, p95)
  get-source-breakdown.handler.ts  Lead volume by source with conversion rates

packages/observability/src/health/index.ts
  HealthCollector implementation:
    recordAILatency(), recordTwilioLatency(), recordCRMResult()
    getPlatformHealth() → PlatformHealthSummary

apps/admin/src/app/ops/
  queues/page.tsx             bull-board embed (BullMQ visual queue inspector)
  ai-debug/page.tsx           Prompt playground against real workspace config
  ai-debug/evals/page.tsx     Eval results browser with hallucination filter
  dead-letters/page.tsx       Failed jobs + one-click reprocess
  workflow-trace/[leadId]/    Full LeadEvent log for any lead
  health/page.tsx             Operational health dashboard — real-time metrics

apps/worker/src/processors/
  analytics-ingest.processor.ts  Event → OperationalMetric table
```

---

## SECTION 17 — GIT + CI STANDARDS

### Branch Strategy
```
main        → production (protected, requires PR + CI pass)
develop     → staging
feature/*   → feature branches from develop
fix/*       → bug fixes
hotfix/*    → from main directly for critical production fixes
```

### Commit Message Format
```
type(scope): description

Types:  feat, fix, refactor, test, docs, chore, perf, security
Scopes: api, worker, web, app, admin, db, ai, compliance, orchestration,
        integrations, auth, config, ui, infra

Examples:
feat(api): implement tenant middleware with workspaceId resolution
fix(compliance): add STOPALL to TCPA opt-out keyword list
test(isolation): add all 8 mandatory workspace isolation tests
security(api): map TenantLeakageError to 404 to prevent enumeration
perf(db): add composite index on leads workspaceId+score
```

### CI Gates — All Must Pass Before Merge
```
pnpm run type-check      zero TypeScript errors across all 16 packages
pnpm run lint            zero ESLint errors
pnpm run test            all unit tests pass
pnpm run test:isolation  all 8 isolation tests pass
prisma validate          schema valid
pnpm run build           build succeeds (no import resolution errors)
```

---

## SECTION 18 — ABSOLUTE PROHIBITIONS

Do not do any of these. Ever. For any reason.

```
ARCHITECTURE:
✗ Kubernetes — use GCP Cloud Run
✗ Microservices — monorepo with package boundaries is the architecture
✗ Separate read/write databases — single Postgres until genuinely needed
✗ AWS or Azure — GCP only
✗ Azure OpenAI or OpenAI direct — Vertex AI Gemini only

DATABASE:
✗ Hard-delete any business data — always soft delete with deletedAt
✗ Autoincrement integer IDs — CUID everywhere
✗ Global Prisma queries without workspaceId — always scope to tenant
✗ Update lead.status directly — always use XState machine
✗ Store operational/queryable data in JSON fields — use typed columns

AI + COMPLIANCE:
✗ Send AI-generated SMS without TCPA opt-out check
✗ Send SMS during quiet hours (9pm-8am recipient local time)
✗ Send SMS without ConsentRecord OPTED_IN
✗ Bypass fair housing filter on any property-related AI message
✗ Use feature flag to disable TCPA checks — they are invariants not features

CODE QUALITY:
✗ Use `any` type — use `unknown` and narrow with type guards
✗ Use non-null assertion (!) — handle null explicitly
✗ Add @ts-ignore — fix the actual type error
✗ Use console.log — use logger from @conversionops/observability
✗ Throw errors across package boundaries — return Result<T,E>
✗ Expose TenantLeakageError message to HTTP client — map to 404

PHASING:
✗ Implement evals without Phase 8 instruction
✗ Implement CRM integrations without Phase 9 instruction
✗ Implement Socket.IO gateway without Phase 6 instruction
✗ Build dashboard UI without Phase 7 instruction
✗ Implement features from Phase N+2 while in Phase N
```

---

## SECTION 19 — SESSION PROTOCOL

### Before Writing Any Code in a New Session
```
1. Read this entire CLAUDE.md — do not skim
2. Identify the current active phase
3. List the exact files to implement in this session
4. Verify all imported packages are already implemented (no stub-importing-stub)
5. Run pnpm run type-check — fix any existing errors before adding new code
6. For Phase 3+: run pnpm run test:isolation — all 8 must pass
```

### Mid-Session Rules
```
- Run pnpm run type-check after each file implementation
- If a type error appears: fix it before proceeding to the next file
- If an import doesn't resolve: implement the dependency first
- Never leave a file in a state that fails type-check
- Commit working state after each phase completes
```

### Definition of Done — A Feature Is Complete When
```
□ TypeScript strict mode — zero errors, zero `any`
□ All imports resolve to implemented (not stub) files
□ Unit tests written and passing
□ workspaceId scope on all Prisma queries (tenant isolation)
□ TCPA check present on any SMS send path
□ IdempotencyKey used on any external webhook handler
□ AuditLog queued (async) for any consequential action
□ Errors returned as Result<T,E> — never thrown across package boundaries
□ No console.log — logger used throughout
□ JSDoc on all public service methods
□ pnpm run type-check passes
□ pnpm run test passes
□ pnpm run test:isolation passes (Phase 3+)
```

---

*ConversionOps — Every lead answered. Every deal captured.*
*conversionops.in — Building the operating system for real estate conversion.*
