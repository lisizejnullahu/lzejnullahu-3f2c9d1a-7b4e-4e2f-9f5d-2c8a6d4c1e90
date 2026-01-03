import { Role, Permission, RolePermissions } from '@secure-task-management/data'

/**
 * Role-to-permissions mapping demonstrating inheritance via superset.
 * Owner >= Admin >= Viewer (Owner has all Admin permissions, Admin has all Viewer permissions)
 */
export const ROLE_PERMISSIONS: RolePermissions = {
  [Role.VIEWER]: [Permission.TASK_VIEW],
  [Role.ADMIN]: [
    Permission.TASK_VIEW,
    Permission.TASK_CREATE,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.AUDIT_VIEW,
  ],
  [Role.OWNER]: [
    Permission.TASK_VIEW,
    Permission.TASK_CREATE,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.AUDIT_VIEW,
  ],
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions.includes(permission)
}

/**
 * Check if a role has any of the required permissions
 */
export function hasAnyPermission(
  role: Role,
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.some((permission) =>
    hasPermission(role, permission)
  )
}

/**
 * Check if a role has all of the required permissions
 */
export function hasAllPermissions(
  role: Role,
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every((permission) =>
    hasPermission(role, permission)
  )
}

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

export function canAccessOrganization(
  userOrgId: number,
  userParentOrgId: number | undefined,
  targetOrgId: number
): boolean {
  return userOrgId === targetOrgId || userParentOrgId === targetOrgId
}
