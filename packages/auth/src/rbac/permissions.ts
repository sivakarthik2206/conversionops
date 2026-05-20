import { UserRole } from './roles';

export type Permission =
  | 'lead:read'
  | 'lead:write'
  | 'conversation:read'
  | 'conversation:write'
  | 'conversation:takeover'
  | 'analytics:read'
  | 'agent:read'
  | 'agent:write'
  | 'agent:suspend'
  | 'routing:read'
  | 'routing:write'
  | 'integrations:read'
  | 'integrations:write'
  | 'settings:read'
  | 'settings:write'
  | 'billing:read'
  | 'billing:write'
  | 'workspace:delete';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.OWNER]: [
    'lead:read', 'lead:write',
    'conversation:read', 'conversation:write', 'conversation:takeover',
    'analytics:read',
    'agent:read', 'agent:write', 'agent:suspend',
    'routing:read', 'routing:write',
    'integrations:read', 'integrations:write',
    'settings:read', 'settings:write',
    'billing:read', 'billing:write',
    'workspace:delete',
  ],
  [UserRole.ADMIN]: [
    'lead:read', 'lead:write',
    'conversation:read', 'conversation:write', 'conversation:takeover',
    'analytics:read',
    'agent:read', 'agent:write', 'agent:suspend',
    'routing:read', 'routing:write',
    'integrations:read', 'integrations:write',
    'settings:read', 'settings:write',
  ],
  [UserRole.AGENT]: [
    'lead:read', 'lead:write',
    'conversation:read', 'conversation:write', 'conversation:takeover',
    'analytics:read',
    'agent:read',
    'settings:read',
  ],
  [UserRole.VIEWER]: [
    'lead:read',
    'conversation:read',
    'analytics:read',
    'agent:read',
    'settings:read',
  ],
};

/**
 * Returns true if the given role has the requested permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
