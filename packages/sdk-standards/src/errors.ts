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
