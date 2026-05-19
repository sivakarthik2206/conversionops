export class ConversionOpsError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ConversionOpsError";
  }
}

export class WorkspaceNotFoundError extends ConversionOpsError {
  constructor(workspaceId: string) {
    super("WORKSPACE_NOT_FOUND", `Workspace ${workspaceId} not found`, { workspaceId });
  }
}

export class TenantLeakageError extends ConversionOpsError {
  constructor(resourceId: string, callerWorkspaceId: string) {
    super("TENANT_LEAKAGE", "Cross-tenant access denied", { resourceId, callerWorkspaceId });
  }
}

export class AIQuotaExceededError extends ConversionOpsError {
  constructor(workspaceId: string, used: number, limit: number) {
    super("AI_QUOTA_EXCEEDED", "Workspace AI token quota exceeded", { workspaceId, used, limit });
  }
}

export class TCPAViolationError extends ConversionOpsError {
  constructor(phone: string, reason: string) {
    super("TCPA_VIOLATION", `Message blocked: ${reason}`, { phone, reason });
  }
}

export class IdempotencyConflictError extends ConversionOpsError {
  constructor(key: string) {
    super("IDEMPOTENCY_CONFLICT", "Request already processing", { key });
  }
}

export class LeadNotFoundError extends ConversionOpsError {
  constructor(leadId: string) {
    super("LEAD_NOT_FOUND", `Lead ${leadId} not found`, { leadId });
  }
}

export class UnauthorizedError extends ConversionOpsError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends ConversionOpsError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message);
  }
}

export class ValidationError extends ConversionOpsError {
  constructor(message: string, context?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, context);
  }
}

export class ExternalServiceError extends ConversionOpsError {
  constructor(service: string, message: string) {
    super("EXTERNAL_SERVICE_ERROR", `${service}: ${message}`, { service });
  }
}
