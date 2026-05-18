# ConversionOps — Standards Reference
# docs/claude/STANDARDS.md

## COMPLIANCE INVARIANTS (legal — cannot be bypassed or feature-flagged)

### TCPA — SMS
```
1. Never send SMS without ConsentRecord where status = 'OPTED_IN'
2. Never send SMS between 9:00pm–8:00am RECIPIENT local timezone
3. Never send after: STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT
4. Opt-out detection BEFORE AI processing — always check first
5. Consent must exist before FIRST outbound SMS
6. On opt-out: immediately set ConsentRecord.status = 'OPTED_OUT', halt all AI
```

### Fair Housing Act
Every AI message mentioning property/neighborhood/area MUST pass
checkFairHousing() from packages/compliance/src/fair-housing/index.ts.
Log result in aiMetadata.fairHousingChecked = true on every message.

### CCPA
PII deletion within 30 days. Use anonymisation not deletion.
Set Lead.piiDeletedAt, null out phone/email/name, replace Message.content with '[PII DELETED]'.

### Data Retention
```
Conversation transcripts:  2 years minimum
Audit logs:                7 years (NEVER purge)
Analytics events:          1 year
Idempotency records:       24 hours (nightly cron)
PII after opt-out:         30 days then anonymise
```

## AI SYSTEM — PRE-SEND CHECKLIST
Execute in this exact order before every AI message:
```typescript
1. isAIAllowed(conversationId, workspaceId)    // workspace/convo pause
2. isOptOutKeyword(inboundMessage)              // TCPA opt-out
3. isQuietHours(workspace.timezone)             // TCPA quiet hours
4. checkTokenQuota(workspaceId)                 // AI governance
   // GENERATE HERE
5. checkFairHousing(generatedContent)           // FHA compliance
   // SEND only if all pass
```

### AI Message Metadata (required on every AI message)
```typescript
interface AIMessageMetadata {
  promptVersion: string;    // 'qualification-v2.3.1'
  promptHash: string;       // SHA-256 of prompt at call time
  modelVersion: string;     // 'gemini-1.5-flash-001'
  chainVersion: string;     // 'qualification-chain-v1.2.0'
  policyVersion: string;    // 'fair-housing-policy-v1.0.0'
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  temperature: number;
  tcpaChecked: boolean;
  fairHousingChecked: boolean;
  quietHoursApplied: boolean;
  evalScores?: {
    relevance?: number;           // 0-1
    hallucination?: number;       // 0-1 (higher = worse)
    bookingIntent?: number;       // 0-1
    qualificationProgress?: number; // 0-1
  };
}
```

### Token Quotas
```
SOLO:        2,000,000/month   Alert at 80%, hard stop at 100%
BROKERAGE:  10,000,000/month   Graceful handoff to agent on quota exceeded
ENTERPRISE:  workspace.tokenQuotaMonthly
```

### Escalation Triggers
```typescript
{ pattern: /lawyer|attorney|sue|legal action/i, level: 'URGENT' }
{ pattern: /discrimination|racist/i,            level: 'URGENT' }
{ pattern: /complaint|manager|supervisor/i,     level: 'ESCALATED' }
{ pattern: /refund|chargeback/i,                level: 'ESCALATED' }
// Also: 3+ turns with zero qualification progress → FLAGGED
```

### Conversation Memory
```
Messages 1-12:   full history to AI
Messages 13+:    contextSummary + last 12 messages
Summarise when:  messageCount > 20
Hard limit:      3,000 input tokens maximum
```

## ERROR CLASSES
```typescript
ConversionOpsError           // base
  WorkspaceNotFoundError     // WORKSPACE_NOT_FOUND
  TenantLeakageError         // TENANT_LEAKAGE → HTTP 404 always (never 403)
  AIQuotaExceededError       // AI_QUOTA_EXCEEDED
  TCPAViolationError         // TCPA_VIOLATION
  IdempotencyConflictError   // IDEMPOTENCY_CONFLICT → HTTP 202
  LeadNotFoundError          // LEAD_NOT_FOUND
  UnauthorizedError          // UNAUTHORIZED → HTTP 401
  ForbiddenError             // FORBIDDEN → HTTP 403
  ValidationError            // VALIDATION_ERROR → HTTP 422
  ExternalServiceError       // EXTERNAL_SERVICE_ERROR
```

TenantLeakageError: HTTP 404, log ERROR level, write audit action='security.tenant_leakage_attempt'

## API ERROR SHAPE (exact — never deviate)
```json
{
  "statusCode": 404,
  "error": "NOT_FOUND",
  "message": "Lead not found",
  "requestId": "req_abc123",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## TESTING STANDARDS

### Mandatory Isolation Tests (all 8 must pass before multi-tenant feature ships)
```typescript
it('workspace B cannot read workspace A leads — expect 404')
it('workspace B cannot update workspace A leads — expect 404')
it('workspace B conversation list returns empty array not error')
it('workspace B Socket.IO receives zero workspace A events')
it('workspace B cannot read workspace A Redis cache key — expect null')
it('AGENT role cannot access billing endpoints — expect 403')
it('VIEWER role cannot send messages — expect 403')
it('OWNER of workspace A cannot modify workspace B — expect 404')
```

### Test Naming
```typescript
describe('[Module] [Class]', () => {
  describe('[method]', () => {
    it('should [expected behaviour] when [condition]')
  });
});
```

## CODE STANDARDS

### TypeScript Strict Mode
```typescript
// NEVER:
const x: any = thing;              // use unknown + narrow
const y = obj!.prop;               // handle null explicitly
// @ts-ignore                       // fix the error
console.log('debug');              // use logger from @conversionops/observability
var z = 5;                         // use const/let

// ALWAYS:
const result: Result<Lead> = await handler.execute(cmd);
if (!result.ok) { handle(result.error); return; }
const lead = result.value;
```

### Naming
```
NestJS files:  kebab-case.type.ts       create-lead.handler.ts
React files:   PascalCase.tsx            LeadCard.tsx
Classes:       PascalCase               CreateLeadHandler
Prisma enums:  PascalCase values         UserRole.ADMIN (not 'ADMIN' string)
Constants:     SCREAMING_SNAKE           QUEUE_NAMES.LEAD_INTAKE
Functions:     camelCase                 createLead
Variables:     camelCase                 workspaceId
```

### Import Order
```typescript
// 1. Node built-ins
import { createHash } from 'crypto';
// 2. External packages
import { Injectable } from '@nestjs/common';
// 3. Internal packages
import { prisma } from '@conversionops/db';
// 4. Relative imports
import { CreateLeadCommand } from './create-lead.command';
```

### JSDoc Required on All Public Service Methods
```typescript
/**
 * Creates a new lead from an inbound webhook.
 * @param command - Source + contact details
 * @returns Result<Lead> — never throws
 */
```

## GIT STANDARDS

### Commit Format
```
feat(scope): description
fix(scope): description
Scopes: api, worker, web, app, admin, db, ai, compliance, orchestration
```

### CI Gates (all must pass before merge)
```
pnpm run type-check     zero TypeScript errors
pnpm run lint           zero ESLint errors
pnpm run test           unit tests pass
pnpm run test:isolation all 8 isolation tests pass (Phase 3+)
```

## PERFORMANCE TARGETS
```
Twilio webhook ack:        < 200ms (Twilio retries at 15s)
Dashboard API reads:       < 300ms p95
AI message generation:     < 5000ms (async via queue)
Realtime event delivery:   < 100ms after queue processing
```
