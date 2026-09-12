export const USER_ROLE = "user" as const;
export const ADMIN_ROLE = "admin" as const;

export const userRoles = [USER_ROLE, ADMIN_ROLE] as const;

export type UserRole = (typeof userRoles)[number];

export function isUserRole(value: string): value is UserRole {
  return userRoles.includes(value as UserRole);
}

export function isAdminRole(role: string) {
  return role === ADMIN_ROLE;
}
