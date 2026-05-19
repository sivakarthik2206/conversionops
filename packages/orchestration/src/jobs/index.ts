export interface LeadIntakeJobData {
  leadId?: string;
  workspaceId: string;
  from?: string;
  to?: string;
  body?: string;
  messageSid?: string;
  source?: string;
  externalId?: string;
  name?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

export interface AiResponseJobData {
  leadId: string;
  workspaceId: string;
  conversationId: string;
}

export interface QualificationJobData {
  leadId: string;
  workspaceId: string;
  conversationId: string;
}

export interface LeadRoutingJobData {
  leadId: string;
  workspaceId: string;
}

export interface AppointmentBookingJobData {
  leadId: string;
  workspaceId: string;
  conversationId?: string;
}

export interface CrmSyncJobData {
  leadId: string;
  workspaceId: string;
}

export interface MissedCallJobData {
  leadId?: string;
  workspaceId: string;
  fromNumber: string;
  toNumber: string;
  callSid: string;
}

export interface ReactivationJobData {
  leadId: string;
  workspaceId: string;
}

export interface NotificationJobData {
  workspaceId?: string;
  recipientWorkspaceUserId?: string;
  type: string;
  payload: Record<string, unknown>;
  isOpsAlert?: boolean;
  opsAlertLevel?: string;
}

export interface AnalyticsIngestJobData {
  leadId?: string;
  workspaceId: string;
  event: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogJobData {
  workspaceId?: string;
  userId?: string;
  role?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface RetentionJobData {
  workspaceId?: string;
}
