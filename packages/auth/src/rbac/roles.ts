export enum UserRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  AGENT = "AGENT",
  VIEWER = "VIEWER",
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.OWNER]: 4,
  [UserRole.ADMIN]: 3,
  [UserRole.AGENT]: 2,
  [UserRole.VIEWER]: 1,
};

export function hasMinimumRole(userRole: UserRole, required: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}
