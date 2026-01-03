import { RequestUser, Role } from '@secure-task-management/data'

/**
 * Get accessible organization IDs for a user.
 * - If user's org is a parent (has parentOrganizationId === orgId), includes child orgs
 * - Otherwise, returns only the user's own org
 *
 * Note: In a real implementation, this would query the database for child orgs.
 * For now, we use the parentOrganizationId field to determine if user is in a parent org.
 */
export function getAccessibleOrgIds(
  userOrgId: number,
  parentOrganizationId?: number,
  role?: Role
): number[] {
  // If user is an OWNER and their org is a parent org (parentOrganizationId === userOrgId),
  // they can access their org and all child orgs
  // For simplicity, we return just the user's org here since we don't have child org IDs
  // In production, this would query: SELECT id FROM organizations WHERE parentId = userOrgId OR id = userOrgId

  if (role === Role.OWNER && parentOrganizationId === userOrgId) {
    // Owner in parent org - has access to parent and children
    // In real implementation: return [userOrgId, ...childOrgIds]
    return [userOrgId]
  }

  // All other cases: only access to own org
  return [userOrgId]
}

/**
 * Helper that works with RequestUser object
 */
export function getAccessibleOrgIdsFromUser(user: RequestUser): number[] {
  return getAccessibleOrgIds(
    user.organizationId,
    user.parentOrganizationId,
    user.role
  )
}

/**
 * Check if a user can access a resource based on org scope
 */
export function canAccessResource(
  user: RequestUser,
  resourceOrgId: number,
  resourceOwnerId?: number
): boolean {
  const accessibleOrgIds = getAccessibleOrgIdsFromUser(user)
  return accessibleOrgIds.includes(resourceOrgId)
}

/**
 * Check if a user can modify a resource based on role and org scope
 * Ownership rules:
 * - VIEWER: Cannot modify anything
 * - ADMIN: Can only modify tasks they created (resourceOwnerId === userId)
 * - OWNER: Can modify any task in their accessible orgs
 */
export function canModifyResource(
  user: RequestUser,
  resourceOrgId: number,
  resourceOwnerId?: number
): boolean {
  // Viewers cannot modify anything
  if (user.role === Role.VIEWER) {
    return false
  }

  // Check org scope first
  const accessibleOrgIds = getAccessibleOrgIdsFromUser(user)
  if (!accessibleOrgIds.includes(resourceOrgId)) {
    return false
  }

  // OWNER can modify any resource in accessible orgs
  if (user.role === Role.OWNER) {
    return true
  }

  // ADMIN can only modify resources they created
  if (user.role === Role.ADMIN) {
    return resourceOwnerId === user.userId
  }

  return false
}

/**
 * Validate that a resource's orgId is in the user's accessible org IDs
 * Throws error if not accessible
 */
export function enforceOrgScope(
  user: RequestUser,
  resourceOrgId: number
): void {
  const accessibleOrgIds = getAccessibleOrgIdsFromUser(user)
  if (!accessibleOrgIds.includes(resourceOrgId)) {
    throw new Error(
      `Access denied: Resource org ${resourceOrgId} not in accessible orgs [${accessibleOrgIds.join(
        ', '
      )}]`
    )
  }
}
