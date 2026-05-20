
import { hasPermission, UserRole } from '@conversionops/auth';

describe('[RbacIsolation] Permission enforcement', () => {
  describe('billing permissions', () => {
    it('AGENT cannot access billing:read', () => {
      expect(hasPermission(UserRole.AGENT, 'billing:read')).toBe(false);
    });

    it('AGENT cannot access billing:write', () => {
      expect(hasPermission(UserRole.AGENT, 'billing:write')).toBe(false);
    });

    it('VIEWER cannot access billing:read', () => {
      expect(hasPermission(UserRole.VIEWER, 'billing:read')).toBe(false);
    });

    it('ADMIN cannot access billing:write', () => {
      expect(hasPermission(UserRole.ADMIN, 'billing:write')).toBe(false);
    });

    it('OWNER can access billing:write', () => {
      expect(hasPermission(UserRole.OWNER, 'billing:write')).toBe(true);
    });
  });

  describe('messaging permissions', () => {
    it('VIEWER cannot send messages (conversation:write)', () => {
      expect(hasPermission(UserRole.VIEWER, 'conversation:write')).toBe(false);
    });

    it('VIEWER cannot take over conversations', () => {
      expect(hasPermission(UserRole.VIEWER, 'conversation:takeover')).toBe(false);
    });

    it('AGENT can send messages', () => {
      expect(hasPermission(UserRole.AGENT, 'conversation:write')).toBe(true);
    });
  });

  describe('admin permissions', () => {
    it('VIEWER cannot write leads', () => {
      expect(hasPermission(UserRole.VIEWER, 'lead:write')).toBe(false);
    });

    it('VIEWER cannot write routing rules', () => {
      expect(hasPermission(UserRole.VIEWER, 'routing:write')).toBe(false);
    });

    it('ADMIN can write routing rules', () => {
      expect(hasPermission(UserRole.ADMIN, 'routing:write')).toBe(true);
    });

    it('AGENT cannot invite other agents', () => {
      expect(hasPermission(UserRole.AGENT, 'agent:write')).toBe(false);
    });

    it('OWNER cannot be deleted by ADMIN', () => {
      expect(hasPermission(UserRole.ADMIN, 'workspace:delete')).toBe(false);
    });
  });

  describe('read permissions', () => {
    it('all roles can read leads', () => {
      for (const role of Object.values(UserRole)) {
        expect(hasPermission(role, 'lead:read')).toBe(true);
      }
    });

    it('all roles can read analytics', () => {
      for (const role of Object.values(UserRole)) {
        expect(hasPermission(role, 'analytics:read')).toBe(true);
      }
    });
  });
});
