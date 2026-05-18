import { UserRole } from "./roles";

export type Permission =
  | "lead:read" | "lead:write" | "lead:assign"
  | "conversation:read" | "conversation:write" | "conversation:takeover"
  | "workspace:read" | "workspace:write" | "workspace:delete"
  | "agent:read" | "agent:write" | "agent:suspend"
  | "billing:read" | "billing:write"
  | "analytics:read"
  | "routing:read" | "routing:write"
  | "audit:read"
  | "ai:configure" | "ai:pause";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.OWNER]: [
    "lead:read", "lead:write", "lead:assign",
    "conversation:read", "conversation:write", "conversation:takeover",
    "workspace:read", "workspace:write", "workspace:delete",
    "agent:read", "agent:write", "agent:suspend",
    "billing:read", "billing:write",
    "analytics:read",
    "routing:read", "routing:write",
    "audit:read",
    "ai:configure", "ai:pause",
  ],
  [UserRole.ADMIN]: [
    "lead:read", "lead:write", "lead:assign",
    "conversation:read", "conversation:write", "conversation:takeover",
    "workspace:read",
    "agent:read", "agent:write",
    "analytics:read",
    "routing:read", "routing:write",
    "audit:read",
    "ai:configure", "ai:pause",
  ],
  [UserRole.AGENT]: [
    "lead:read",
    "conversation:read", "conversation:write", "conversation:takeover",
    "workspace:read",
    "agent:read",
  ],
  [UserRole.VIEWER]: [
    "lead:read",
    "conversation:read",
    "workspace:read",
    "analytics:read",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
