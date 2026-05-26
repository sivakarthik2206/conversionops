/**
 * Unit tests for RBAC permission matrix from the API perspective.
 * Verifies the permission system correctly enforces role boundaries
 * across all protected operations.
 */
import { hasPermission, UserRole } from '@conversionops/auth';
import type { Permission } from '@conversionops/auth';

const ALL_ROLES = [UserRole.OWNER, UserRole.ADMIN, UserRole.AGENT, UserRole.VIEWER] as const;

describe('RBAC — hasPermission', () => {
  describe('lead operations', () => {
    it('all roles can read leads', () => {
      ALL_ROLES.forEach(role => {
        expect(hasPermission(role, 'lead:read')).toBe(true);
      });
    });

    it('OWNER, ADMIN, AGENT can write leads', () => {
      expect(hasPermission(UserRole.OWNER, 'lead:write')).toBe(true);
      expect(hasPermission(UserRole.ADMIN, 'lead:write')).toBe(true);
      expect(hasPermission(UserRole.AGENT, 'lead:write')).toBe(true);
    });

    it('VIEWER cannot write leads', () => {
      expect(hasPermission(UserRole.VIEWER, 'lead:write')).toBe(false);
    });
  });

  describe('conversation operations', () => {
    it('all roles except VIEWER can write conversations', () => {
      expect(hasPermission(UserRole.OWNER, 'conversation:write')).toBe(true);
      expect(hasPermission(UserRole.ADMIN, 'conversation:write')).toBe(true);
      expect(hasPermission(UserRole.AGENT, 'conversation:write')).toBe(true);
      expect(hasPermission(UserRole.VIEWER, 'conversation:write')).toBe(false);
    });

    it('all roles can read conversations', () => {
      ALL_ROLES.forEach(role => {
        expect(hasPermission(role, 'conversation:read')).toBe(true);
      });
    });

    it('OWNER, ADMIN, AGENT can take over conversations', () => {
      expect(hasPermission(UserRole.OWNER, 'conversation:takeover')).toBe(true);
      expect(hasPermission(UserRole.ADMIN, 'conversation:takeover')).toBe(true);
      expect(hasPermission(UserRole.AGENT, 'conversation:takeover')).toBe(true);
      expect(hasPermission(UserRole.VIEWER, 'conversation:takeover')).toBe(false);
    });
  });

  describe('analytics access', () => {
    it('all roles can read analytics', () => {
      ALL_ROLES.forEach(role => {
        expect(hasPermission(role, 'analytics:read')).toBe(true);
      });
    });
  });

  describe('settings operations', () => {
    it('all roles can read settings', () => {
      ALL_ROLES.forEach(role => {
        expect(hasPermission(role, 'settings:read')).toBe(true);
      });
    });

    it('only OWNER and ADMIN can write settings', () => {
      expect(hasPermission(UserRole.OWNER, 'settings:write')).toBe(true);
      expect(hasPermission(UserRole.ADMIN, 'settings:write')).toBe(true);
      expect(hasPermission(UserRole.AGENT, 'settings:write')).toBe(false);
      expect(hasPermission(UserRole.VIEWER, 'settings:write')).toBe(false);
    });
  });

  describe('billing operations (OWNER only)', () => {
    it('only OWNER can read billing', () => {
      expect(hasPermission(UserRole.OWNER, 'billing:read')).toBe(true);
      expect(hasPermission(UserRole.ADMIN, 'billing:read')).toBe(false);
      expect(hasPermission(UserRole.AGENT, 'billing:read')).toBe(false);
      expect(hasPermission(UserRole.VIEWER, 'billing:read')).toBe(false);
    });

    it('only OWNER can write billing', () => {
      expect(hasPermission(UserRole.OWNER, 'billing:write')).toBe(true);
      expect(hasPermission(UserRole.ADMIN, 'billing:write')).toBe(false);
      expect(hasPermission(UserRole.AGENT, 'billing:write')).toBe(false);
      expect(hasPermission(UserRole.VIEWER, 'billing:write')).toBe(false);
    });
  });

  describe('workspace:delete (OWNER only — destructive)', () => {
    it('only OWNER can delete the workspace', () => {
      expect(hasPermission(UserRole.OWNER, 'workspace:delete')).toBe(true);
      expect(hasPermission(UserRole.ADMIN, 'workspace:delete')).toBe(false);
      expect(hasPermission(UserRole.AGENT, 'workspace:delete')).toBe(false);
      expect(hasPermission(UserRole.VIEWER, 'workspace:delete')).toBe(false);
    });
  });

  describe('agent management', () => {
    it('OWNER and ADMIN can suspend agents', () => {
      expect(hasPermission(UserRole.OWNER, 'agent:suspend')).toBe(true);
      expect(hasPermission(UserRole.ADMIN, 'agent:suspend')).toBe(true);
      expect(hasPermission(UserRole.AGENT, 'agent:suspend')).toBe(false);
      expect(hasPermission(UserRole.VIEWER, 'agent:suspend')).toBe(false);
    });

    it('OWNER and ADMIN can write agent config', () => {
      expect(hasPermission(UserRole.OWNER, 'agent:write')).toBe(true);
      expect(hasPermission(UserRole.ADMIN, 'agent:write')).toBe(true);
      expect(hasPermission(UserRole.AGENT, 'agent:write')).toBe(false);
      expect(hasPermission(UserRole.VIEWER, 'agent:write')).toBe(false);
    });
  });

  describe('routing operations', () => {
    it('only OWNER and ADMIN can write routing rules', () => {
      expect(hasPermission(UserRole.OWNER, 'routing:write')).toBe(true);
      expect(hasPermission(UserRole.ADMIN, 'routing:write')).toBe(true);
      expect(hasPermission(UserRole.AGENT, 'routing:write')).toBe(false);
      expect(hasPermission(UserRole.VIEWER, 'routing:write')).toBe(false);
    });
  });

  describe('VIEWER is strictly read-only', () => {
    const writePermissions: Permission[] = [
      'lead:write',
      'conversation:write',
      'conversation:takeover',
      'agent:write',
      'agent:suspend',
      'routing:write',
      'integrations:write',
      'settings:write',
      'billing:read',
      'billing:write',
      'workspace:delete',
    ];

    writePermissions.forEach(permission => {
      it(`VIEWER is denied ${permission}`, () => {
        expect(hasPermission(UserRole.VIEWER, permission)).toBe(false);
      });
    });
  });
});
