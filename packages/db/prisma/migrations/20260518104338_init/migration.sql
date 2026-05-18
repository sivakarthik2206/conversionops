-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('SOLO', 'BROKERAGE', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'PAUSED', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'AGENT', 'VIEWER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFYING', 'QUALIFIED', 'ROUTING', 'ASSIGNED', 'APPOINTMENT_REQUESTED', 'APPOINTMENT_SCHEDULED', 'CONVERTED', 'OPT_OUT', 'DISQUALIFIED', 'UNRESPONSIVE', 'DORMANT', 'REACTIVATED');

-- CreateEnum
CREATE TYPE "LeadTier" AS ENUM ('UNQUALIFIED', 'COLD', 'WARM', 'HOT', 'PRIORITY');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('ZILLOW', 'REALTOR_COM', 'WEB_FORM', 'MISSED_CALL', 'SMS_INBOUND', 'MANUAL', 'REACTIVATION', 'REFERRAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('AI_ACTIVE', 'HUMAN_ACTIVE', 'APPOINTMENT_PENDING', 'COMPLETED', 'OPT_OUT', 'DORMANT');

-- CreateEnum
CREATE TYPE "EscalationLevel" AS ENUM ('NONE', 'FLAGGED', 'ESCALATED', 'URGENT');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('AI', 'HUMAN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('SMS', 'EMAIL', 'CHAT_WIDGET', 'VOICE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'OPTED_IN', 'OPTED_OUT', 'REVOKED');

-- CreateEnum
CREATE TYPE "ConsentChannel" AS ENUM ('SMS', 'EMAIL', 'VOICE');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('HOT_LEAD_ALERT', 'APPOINTMENT_BOOKED', 'AGENT_TAKEOVER_REQUEST', 'AI_ESCALATION', 'MISSED_CALL_RECOVERY', 'REACTIVATION_SUCCESS', 'AI_PAUSED_ALERT', 'QUOTA_WARNING', 'BILLING_ALERT', 'OPS_ALERT');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED');

-- CreateEnum
CREATE TYPE "WorkflowEventType" AS ENUM ('STARTED', 'STEP_COMPLETED', 'STEP_FAILED', 'RETRYING', 'PAUSED', 'RESUMED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RoutingStrategy" AS ENUM ('ROUND_ROBIN', 'PERFORMANCE_BASED', 'GEOGRAPHY', 'LANGUAGE', 'AVAILABILITY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AIEvalStatus" AS ENUM ('PENDING', 'SCORED', 'FAILED');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'SOLO',
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'ONBOARDING',
    "ownerEmail" TEXT NOT NULL,
    "ownerPhone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "locale" TEXT NOT NULL DEFAULT 'en-US',
    "twilioNumber" TEXT,
    "twilioNumberSid" TEXT,
    "twilioSubaccountSid" TEXT,
    "aiConfig" JSONB NOT NULL DEFAULT '{}',
    "tokenUsageCurrentMonth" INTEGER NOT NULL DEFAULT 0,
    "tokenQuotaMonthly" INTEGER NOT NULL DEFAULT 2000000,
    "tokenQuotaAlertSentAt" TIMESTAMP(3),
    "aiPaused" BOOLEAN NOT NULL DEFAULT false,
    "aiPausedAt" TIMESTAMP(3),
    "aiPausedBy" TEXT,
    "aiPauseReason" TEXT,
    "featureFlags" JSONB NOT NULL DEFAULT '{}',
    "onboardingStep" INTEGER NOT NULL DEFAULT 1,
    "onboardingCompletedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "retentionPolicy" JSONB NOT NULL DEFAULT '{}',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "billingEmail" TEXT,
    "trialEndsAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "magicLinkToken" TEXT,
    "magicLinkExpiresAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspendedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceUser" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'AGENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayName" TEXT,
    "bio" TEXT,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY['en']::TEXT[],
    "serviceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalLeadsAssigned" INTEGER NOT NULL DEFAULT 0,
    "totalConversions" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTimeMs" INTEGER,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "unavailableUntil" TIMESTAMP(3),
    "notifyOnNewLead" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnHotLead" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnEscalation" BOOLEAN NOT NULL DEFAULT true,
    "notifyChannel" "Channel" NOT NULL DEFAULT 'SMS',
    "removedAt" TIMESTAMP(3),
    "removedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WorkspaceUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "source" "LeadSource" NOT NULL,
    "externalId" TEXT,
    "referenceId" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "fullName" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "tier" "LeadTier" NOT NULL DEFAULT 'UNQUALIFIED',
    "score" INTEGER NOT NULL DEFAULT 0,
    "qualification" JSONB NOT NULL DEFAULT '{}',
    "sourcePayload" JSONB NOT NULL DEFAULT '{}',
    "assignedWorkspaceUserId" TEXT,
    "reactivationCount" INTEGER NOT NULL DEFAULT 0,
    "lastReactivatedAt" TIMESTAMP(3),
    "reactivationSource" TEXT,
    "aiPausedForLead" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "piiDeletedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAssignment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "workspaceUserId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "routingRuleId" TEXT,
    "routingReason" TEXT,
    "routingScore" DOUBLE PRECISION,
    "responseTimeMs" INTEGER,
    "wasConverted" BOOLEAN,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LeadAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "channel" "Channel" NOT NULL DEFAULT 'SMS',
    "status" "ConversationStatus" NOT NULL DEFAULT 'AI_ACTIVE',
    "aiActive" BOOLEAN NOT NULL DEFAULT true,
    "takenOverBy" TEXT,
    "takenOverAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "escalationLevel" "EscalationLevel" NOT NULL DEFAULT 'NONE',
    "escalationReason" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "contextSummary" TEXT,
    "summarisedUpTo" TEXT,
    "twilioConversationSid" TEXT,
    "fromNumber" TEXT,
    "toNumber" TEXT,
    "deletedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "aiMetadata" JSONB,
    "providerMessageId" TEXT,
    "providerPayload" JSONB,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "timezone" TEXT NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "workspaceUserId" TEXT,
    "externalBookingId" TEXT,
    "externalPayload" JSONB,
    "bookingUrl" TEXT,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "rescheduledFrom" TEXT,
    "noShowAt" TIMESTAMP(3),
    "crmSyncedAt" TIMESTAMP(3),
    "crmExternalId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowExecution" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT,
    "workflowName" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING',
    "currentState" TEXT,
    "stateSnapshot" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "timeoutAt" TIMESTAMP(3),
    "lastError" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "bullJobId" TEXT,
    "bullQueueName" TEXT,
    "triggeredBy" TEXT,
    "triggerSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowEvent" (
    "id" TEXT NOT NULL,
    "workflowExecutionId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "WorkflowEventType" NOT NULL,
    "fromState" TEXT,
    "toState" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "errorCode" TEXT,
    "errorStack" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "triggeredBy" TEXT,
    "triggerSource" TEXT,
    "correlationId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "channel" "ConsentChannel" NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "consentMethod" TEXT,
    "consentText" TEXT,
    "consentSource" TEXT,
    "ipAddress" TEXT,
    "optedOutAt" TIMESTAMP(3),
    "optOutKeyword" TEXT,
    "optOutChannel" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT,
    "messageId" TEXT,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'vertex-ai',
    "promptVersion" TEXT,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "operation" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "billingMonth" INTEGER NOT NULL,
    "billingDay" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIEvalResult" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "status" "AIEvalStatus" NOT NULL DEFAULT 'PENDING',
    "evalRunnerVersion" TEXT,
    "promptVersion" TEXT,
    "modelVersion" TEXT,
    "relevanceScore" DOUBLE PRECISION,
    "hallucinationScore" DOUBLE PRECISION,
    "bookingIntentScore" DOUBLE PRECISION,
    "qualProgressScore" DOUBLE PRECISION,
    "toneScore" DOUBLE PRECISION,
    "complianceScore" DOUBLE PRECISION,
    "overallScore" DOUBLE PRECISION,
    "failReason" TEXT,
    "flaggedIssues" JSONB,
    "ciRunId" TEXT,
    "isRegression" BOOLEAN NOT NULL DEFAULT false,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AIEvalResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingRule" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "strategy" "RoutingStrategy" NOT NULL DEFAULT 'ROUND_ROBIN',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "actions" JSONB NOT NULL DEFAULT '{}',
    "expression" TEXT,
    "targetUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalRouted" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "channel" "Channel" NOT NULL,
    "recipientUserId" TEXT,
    "recipientPhone" TEXT,
    "recipientEmail" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failReason" TEXT,
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "key" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'PROCESSING',
    "result" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "role" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlagOverride" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "enabledAt" TIMESTAMP(3),
    "enabledBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FeatureFlagOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalMetric" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '{}',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OperationalMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AgentRoutingRules" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_twilioNumber_key" ON "Workspace"("twilioNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_stripeCustomerId_key" ON "Workspace"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_stripeSubscriptionId_key" ON "Workspace"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Workspace_status_idx" ON "Workspace"("status");

-- CreateIndex
CREATE INDEX "Workspace_plan_idx" ON "Workspace"("plan");

-- CreateIndex
CREATE INDEX "Workspace_deletedAt_idx" ON "Workspace"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_magicLinkToken_key" ON "User"("magicLinkToken");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "WorkspaceUser_workspaceId_role_idx" ON "WorkspaceUser"("workspaceId", "role");

-- CreateIndex
CREATE INDEX "WorkspaceUser_workspaceId_isActive_idx" ON "WorkspaceUser"("workspaceId", "isActive");

-- CreateIndex
CREATE INDEX "WorkspaceUser_workspaceId_conversionRate_idx" ON "WorkspaceUser"("workspaceId", "conversionRate");

-- CreateIndex
CREATE INDEX "WorkspaceUser_userId_idx" ON "WorkspaceUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceUser_workspaceId_userId_key" ON "WorkspaceUser"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "Lead_workspaceId_status_idx" ON "Lead"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Lead_workspaceId_tier_idx" ON "Lead"("workspaceId", "tier");

-- CreateIndex
CREATE INDEX "Lead_workspaceId_score_idx" ON "Lead"("workspaceId", "score");

-- CreateIndex
CREATE INDEX "Lead_workspaceId_createdAt_idx" ON "Lead"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_workspaceId_assignedWorkspaceUserId_idx" ON "Lead"("workspaceId", "assignedWorkspaceUserId");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_deletedAt_idx" ON "Lead"("deletedAt");

-- CreateIndex
CREATE INDEX "Lead_source_idx" ON "Lead"("source");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_workspaceId_externalId_key" ON "Lead"("workspaceId", "externalId");

-- CreateIndex
CREATE INDEX "LeadAssignment_workspaceId_leadId_idx" ON "LeadAssignment"("workspaceId", "leadId");

-- CreateIndex
CREATE INDEX "LeadAssignment_workspaceId_workspaceUserId_idx" ON "LeadAssignment"("workspaceId", "workspaceUserId");

-- CreateIndex
CREATE INDEX "LeadAssignment_workspaceId_assignedAt_idx" ON "LeadAssignment"("workspaceId", "assignedAt");

-- CreateIndex
CREATE INDEX "LeadAssignment_leadId_idx" ON "LeadAssignment"("leadId");

-- CreateIndex
CREATE INDEX "Conversation_workspaceId_status_idx" ON "Conversation"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Conversation_workspaceId_leadId_idx" ON "Conversation"("workspaceId", "leadId");

-- CreateIndex
CREATE INDEX "Conversation_workspaceId_createdAt_idx" ON "Conversation"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_leadId_idx" ON "Conversation"("leadId");

-- CreateIndex
CREATE INDEX "Conversation_fromNumber_idx" ON "Conversation"("fromNumber");

-- CreateIndex
CREATE INDEX "Conversation_toNumber_idx" ON "Conversation"("toNumber");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_workspaceId_role_idx" ON "Message"("workspaceId", "role");

-- CreateIndex
CREATE INDEX "Message_workspaceId_createdAt_idx" ON "Message"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_providerMessageId_idx" ON "Message"("providerMessageId");

-- CreateIndex
CREATE INDEX "Appointment_workspaceId_status_idx" ON "Appointment"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Appointment_workspaceId_scheduledAt_idx" ON "Appointment"("workspaceId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_workspaceId_leadId_idx" ON "Appointment"("workspaceId", "leadId");

-- CreateIndex
CREATE INDEX "Appointment_workspaceId_workspaceUserId_idx" ON "Appointment"("workspaceId", "workspaceUserId");

-- CreateIndex
CREATE INDEX "Appointment_externalBookingId_idx" ON "Appointment"("externalBookingId");

-- CreateIndex
CREATE INDEX "WorkflowExecution_workspaceId_status_idx" ON "WorkflowExecution"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "WorkflowExecution_workspaceId_workflowName_idx" ON "WorkflowExecution"("workspaceId", "workflowName");

-- CreateIndex
CREATE INDEX "WorkflowExecution_workspaceId_leadId_idx" ON "WorkflowExecution"("workspaceId", "leadId");

-- CreateIndex
CREATE INDEX "WorkflowExecution_leadId_idx" ON "WorkflowExecution"("leadId");

-- CreateIndex
CREATE INDEX "WorkflowExecution_status_nextRetryAt_idx" ON "WorkflowExecution"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "WorkflowExecution_bullJobId_idx" ON "WorkflowExecution"("bullJobId");

-- CreateIndex
CREATE INDEX "WorkflowEvent_workflowExecutionId_occurredAt_idx" ON "WorkflowEvent"("workflowExecutionId", "occurredAt");

-- CreateIndex
CREATE INDEX "WorkflowEvent_workspaceId_type_idx" ON "WorkflowEvent"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "WorkflowEvent_workspaceId_occurredAt_idx" ON "WorkflowEvent"("workspaceId", "occurredAt");

-- CreateIndex
CREATE INDEX "LeadEvent_workspaceId_leadId_idx" ON "LeadEvent"("workspaceId", "leadId");

-- CreateIndex
CREATE INDEX "LeadEvent_workspaceId_type_idx" ON "LeadEvent"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "LeadEvent_workspaceId_occurredAt_idx" ON "LeadEvent"("workspaceId", "occurredAt");

-- CreateIndex
CREATE INDEX "LeadEvent_correlationId_idx" ON "LeadEvent"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadEvent_leadId_sequence_key" ON "LeadEvent"("leadId", "sequence");

-- CreateIndex
CREATE INDEX "ConsentRecord_phone_channel_status_idx" ON "ConsentRecord"("phone", "channel", "status");

-- CreateIndex
CREATE INDEX "ConsentRecord_email_channel_status_idx" ON "ConsentRecord"("email", "channel", "status");

-- CreateIndex
CREATE INDEX "ConsentRecord_workspaceId_status_idx" ON "ConsentRecord"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ConsentRecord_workspaceId_leadId_idx" ON "ConsentRecord"("workspaceId", "leadId");

-- CreateIndex
CREATE INDEX "ConsentRecord_optedOutAt_idx" ON "ConsentRecord"("optedOutAt");

-- CreateIndex
CREATE INDEX "AIUsageRecord_workspaceId_billingMonth_idx" ON "AIUsageRecord"("workspaceId", "billingMonth");

-- CreateIndex
CREATE INDEX "AIUsageRecord_workspaceId_createdAt_idx" ON "AIUsageRecord"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AIUsageRecord_billingMonth_idx" ON "AIUsageRecord"("billingMonth");

-- CreateIndex
CREATE INDEX "AIUsageRecord_model_billingMonth_idx" ON "AIUsageRecord"("model", "billingMonth");

-- CreateIndex
CREATE INDEX "AIEvalResult_workspaceId_runAt_idx" ON "AIEvalResult"("workspaceId", "runAt");

-- CreateIndex
CREATE INDEX "AIEvalResult_messageId_idx" ON "AIEvalResult"("messageId");

-- CreateIndex
CREATE INDEX "AIEvalResult_hallucinationScore_idx" ON "AIEvalResult"("hallucinationScore");

-- CreateIndex
CREATE INDEX "AIEvalResult_overallScore_idx" ON "AIEvalResult"("overallScore");

-- CreateIndex
CREATE INDEX "AIEvalResult_isRegression_idx" ON "AIEvalResult"("isRegression");

-- CreateIndex
CREATE INDEX "AIEvalResult_ciRunId_idx" ON "AIEvalResult"("ciRunId");

-- CreateIndex
CREATE INDEX "RoutingRule_workspaceId_isActive_priority_idx" ON "RoutingRule"("workspaceId", "isActive", "priority");

-- CreateIndex
CREATE INDEX "RoutingRule_workspaceId_strategy_idx" ON "RoutingRule"("workspaceId", "strategy");

-- CreateIndex
CREATE INDEX "Notification_workspaceId_type_status_idx" ON "Notification"("workspaceId", "type", "status");

-- CreateIndex
CREATE INDEX "Notification_workspaceId_createdAt_idx" ON "Notification"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_workspaceId_leadId_idx" ON "Notification"("workspaceId", "leadId");

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_idx" ON "Notification"("recipientUserId");

-- CreateIndex
CREATE INDEX "Notification_status_sentAt_idx" ON "Notification"("status", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_key_key" ON "IdempotencyKey"("key");

-- CreateIndex
CREATE INDEX "IdempotencyKey_key_idx" ON "IdempotencyKey"("key");

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- CreateIndex
CREATE INDEX "IdempotencyKey_source_status_idx" ON "IdempotencyKey"("source", "status");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_occurredAt_idx" ON "AuditLog"("workspaceId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_action_idx" ON "AuditLog"("workspaceId", "action");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_resource_resourceId_idx" ON "AuditLog"("workspaceId", "resource", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_occurredAt_idx" ON "AuditLog"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_occurredAt_idx" ON "AuditLog"("occurredAt");

-- CreateIndex
CREATE INDEX "FeatureFlagOverride_workspaceId_idx" ON "FeatureFlagOverride"("workspaceId");

-- CreateIndex
CREATE INDEX "FeatureFlagOverride_flag_idx" ON "FeatureFlagOverride"("flag");

-- CreateIndex
CREATE INDEX "FeatureFlagOverride_expiresAt_idx" ON "FeatureFlagOverride"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlagOverride_workspaceId_flag_key" ON "FeatureFlagOverride"("workspaceId", "flag");

-- CreateIndex
CREATE INDEX "OperationalMetric_metric_recordedAt_idx" ON "OperationalMetric"("metric", "recordedAt");

-- CreateIndex
CREATE INDEX "OperationalMetric_workspaceId_metric_recordedAt_idx" ON "OperationalMetric"("workspaceId", "metric", "recordedAt");

-- CreateIndex
CREATE INDEX "OperationalMetric_recordedAt_idx" ON "OperationalMetric"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "_AgentRoutingRules_AB_unique" ON "_AgentRoutingRules"("A", "B");

-- CreateIndex
CREATE INDEX "_AgentRoutingRules_B_index" ON "_AgentRoutingRules"("B");

-- AddForeignKey
ALTER TABLE "WorkspaceUser" ADD CONSTRAINT "WorkspaceUser_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceUser" ADD CONSTRAINT "WorkspaceUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_workspaceUserId_fkey" FOREIGN KEY ("workspaceUserId") REFERENCES "WorkspaceUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_routingRuleId_fkey" FOREIGN KEY ("routingRuleId") REFERENCES "RoutingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowEvent" ADD CONSTRAINT "WorkflowEvent_workflowExecutionId_fkey" FOREIGN KEY ("workflowExecutionId") REFERENCES "WorkflowExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageRecord" ADD CONSTRAINT "AIUsageRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIEvalResult" ADD CONSTRAINT "AIEvalResult_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingRule" ADD CONSTRAINT "RoutingRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlagOverride" ADD CONSTRAINT "FeatureFlagOverride_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalMetric" ADD CONSTRAINT "OperationalMetric_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AgentRoutingRules" ADD CONSTRAINT "_AgentRoutingRules_A_fkey" FOREIGN KEY ("A") REFERENCES "RoutingRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AgentRoutingRules" ADD CONSTRAINT "_AgentRoutingRules_B_fkey" FOREIGN KEY ("B") REFERENCES "WorkspaceUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
