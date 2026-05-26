import { hasPermission } from '../rbac/permissions';
import { UserRole } from '../rbac/roles';
import type { Permission } from '../rbac/permissions';

describe('RBAC — hasPermission', () => {
  // ----- OWNER -----
  describe('OWNER role', () => {
    const ownerPermissions: Permission[] = [
      'lead:read', 'lead:write',
      'conversation:read', 'conversation:write', 'conversation:takeover',
      'analytics:read',
      'agent:read', 'agent:write', 'agent:suspend',
      'routing:read', 'routing:write',
      'integrations:read', 'integrations:write',
      'settings:read', 'settings:write',
      'billing:read', 'billing:write',
      'workspace:delete',
    ];

    it.each(ownerPermissions)('OWNER has %s', (perm) => {
      expect(hasPermission(UserRole.OWNER, perm)).toBe(true);
    });
  });

  // ----- ADMIN -----
  describe('ADMIN role', () => {
    const adminAllowed: Permission[] = [
      'lead:read', 'lead:write',
      'conversation:read', 'conversation:write', 'conversation:takeover',
      'analytics:read',
      'agent:read', 'agent:write', 'agent:suspend',
      'routing:read', 'routing:write',
      'integrations:read', 'integrations:write',
      'settings:read', 'settings:write',
    ];
    const adminDenied: Permission[] = ['billing:read', 'billing:write', 'workspace:delete'];

    it.each(adminAllowed)('ADMIN has %s', (perm) => {
      expect(hasPermission(UserRole.ADMIN, perm)).toBe(true);
    });

    it.each(adminDenied)('ADMIN does NOT have %s', (perm) => {
      expect(hasPermission(UserRole.ADMIN, perm)).toBe(false);
    });
  });

  // ----- AGENT -----
  describe('AGENT role', () => {
    const agentAllowed: Permission[] = [
      'lead:read', 'lead:write',
      'conversation:read', 'conversation:write', 'conversation:takeover',
      'analytics:read',
      'agent:read',
      'settings:read',
    ];
    const agentDenied: Permission[] = [
      'agent:write', 'agent:suspend',
      'routing:read', 'routing:write',
      'integrations:read', 'integrations:write',
      'settings:write',
      'billing:read', 'billing:write',
      'workspace:delete',
    ];

    it.each(agentAllowed)('AGENT has %s', (perm) => {
      expect(hasPermission(UserRole.AGENT, perm)).toBe(true);
    });

    it.each(agentDenied)('AGENT does NOT have %s', (perm) => {
      expect(hasPermission(UserRole.AGENT, perm)).toBe(false);
    });
  });

  // ----- VIEWER -----
  describe('VIEWER role', () => {
    const viewerAllowed: Permission[] = [
      'lead:read',
      'conversation:read',
      'analytics:read',
      'agent:read',
      'settings:read',
    ];
    const viewerDenied: Permission[] = [
      'lead:write',
      'conversation:write', 'conversation:takeover',
      'agent:write', 'agent:suspend',
      'routing:read', 'routing:write',
      'integrations:read', 'integrations:write',
      'settings:write',
      'billing:read', 'billing:write',
      'workspace:delete',
    ];

    it.each(viewerAllowed)('VIEWER has %s', (perm) => {
      expect(hasPermission(UserRole.VIEWER, perm)).toBe(true);
    });

    it.each(viewerDenied)('VIEWER does NOT have %s', (perm) => {
      expect(hasPermission(UserRole.VIEWER, perm)).toBe(false);
    });
  });

  // ----- Security invariants -----
  describe('Security invariants', () => {
    it('only OWNER can delete workspace', () => {
      expect(hasPermission(UserRole.OWNER, 'workspace:delete')).toBe(true);
      expect(hasPermission(UserRole.ADMIN, 'workspace:delete')).toBe(false);
      expect(hasPermission(UserRole.AGENT, 'workspace:delete')).toBe(false);
      expect(hasPermission(UserRole.VIEWER, 'workspace:delete')).toBe(false);
    });

    it('only OWNER can manage billing', () => {
      expect(hasPermission(UserRole.OWNER, 'billing:write')).toBe(true);
      expect(hasPermission(UserRole.ADMIN, 'billing:write')).toBe(false);
      expect(hasPermission(UserRole.AGENT, 'billing:write')).toBe(false);
      expect(hasPermission(UserRole.VIEWER, 'billing:write')).toBe(false);
    });

    it('all roles can read leads (dashboard access)', () => {
      for (const role of Object.values(UserRole)) {
        expect(hasPermission(role, 'lead:read')).toBe(true);
      }
    });

    it('all roles can read analytics', () => {
      for (const role of Object.values(UserRole)) {
        expect(hasPermission(role, 'analytics:read')).toBe(true);
      }
    });

    it('VIEWER has strictly read-only access (no write permissions)', () => {
      const writePerms: Permission[] = [
        'lead:write', 'conversation:write', 'conversation:takeover',
        'agent:write', 'agent:suspend', 'routing:write',
        'integrations:write', 'settings:write', 'billing:write', 'workspace:delete',
      ];
      writePerms.forEach(perm => {
        expect(hasPermission(UserRole.VIEWER, perm)).toBe(false);
      });
    });

    it('AGENT cannot invite or suspend other agents', () => {
      expect(hasPermission(UserRole.AGENT, 'agent:write')).toBe(false);
      expect(hasPermission(UserRole.AGENT, 'agent:suspend')).toBe(false);
    });

    it('AGENT cannot access integrations settings', () => {
      expect(hasPermission(UserRole.AGENT, 'integrations:read')).toBe(false);
      expect(hasPermission(UserRole.AGENT, 'integrations:write')).toBe(false);
    });
  });
});
