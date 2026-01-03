import { Role, Permission } from '@secure-task-management/data'
import {
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from './permissions.helper'

describe('PermissionsHelper', () => {
  describe('ROLE_PERMISSIONS mapping', () => {
    it('should define permissions for VIEWER role', () => {
      expect(ROLE_PERMISSIONS[Role.VIEWER]).toEqual([Permission.TASK_VIEW])
    })

    it('should define permissions for ADMIN role (superset of VIEWER)', () => {
      const adminPerms = ROLE_PERMISSIONS[Role.ADMIN]
      const viewerPerms = ROLE_PERMISSIONS[Role.VIEWER]

      expect(adminPerms).toContain(Permission.TASK_VIEW)
      expect(adminPerms).toContain(Permission.TASK_CREATE)
      expect(adminPerms).toContain(Permission.TASK_UPDATE)
      expect(adminPerms).toContain(Permission.TASK_DELETE)
      expect(adminPerms).toContain(Permission.AUDIT_VIEW)

      // Admin should have all Viewer permissions
      viewerPerms.forEach((perm) => {
        expect(adminPerms).toContain(perm)
      })
    })

    it('should define permissions for OWNER role (superset of ADMIN)', () => {
      const ownerPerms = ROLE_PERMISSIONS[Role.OWNER]
      const adminPerms = ROLE_PERMISSIONS[Role.ADMIN]

      expect(ownerPerms).toContain(Permission.TASK_VIEW)
      expect(ownerPerms).toContain(Permission.TASK_CREATE)
      expect(ownerPerms).toContain(Permission.TASK_UPDATE)
      expect(ownerPerms).toContain(Permission.TASK_DELETE)
      expect(ownerPerms).toContain(Permission.AUDIT_VIEW)

      // Owner should have all Admin permissions
      adminPerms.forEach((perm) => {
        expect(ownerPerms).toContain(perm)
      })
    })

    it('should demonstrate inheritance: OWNER >= ADMIN >= VIEWER', () => {
      const viewerPerms = ROLE_PERMISSIONS[Role.VIEWER]
      const adminPerms = ROLE_PERMISSIONS[Role.ADMIN]
      const ownerPerms = ROLE_PERMISSIONS[Role.OWNER]

      // VIEWER has fewest permissions
      expect(viewerPerms.length).toBeLessThan(adminPerms.length)

      // ADMIN has more than VIEWER but same as OWNER in this implementation
      expect(adminPerms.length).toBeGreaterThan(viewerPerms.length)

      // OWNER has same or more than ADMIN
      expect(ownerPerms.length).toBeGreaterThanOrEqual(adminPerms.length)
    })
  })

  describe('hasPermission', () => {
    it('should return true when role has the permission', () => {
      expect(hasPermission(Role.VIEWER, Permission.TASK_VIEW)).toBe(true)
      expect(hasPermission(Role.ADMIN, Permission.TASK_CREATE)).toBe(true)
      expect(hasPermission(Role.OWNER, Permission.AUDIT_VIEW)).toBe(true)
    })

    it('should return false when role does not have the permission', () => {
      expect(hasPermission(Role.VIEWER, Permission.TASK_CREATE)).toBe(false)
      expect(hasPermission(Role.VIEWER, Permission.TASK_UPDATE)).toBe(false)
      expect(hasPermission(Role.VIEWER, Permission.AUDIT_VIEW)).toBe(false)
    })

    it('should enforce permission inheritance', () => {
      // VIEWER can only view
      expect(hasPermission(Role.VIEWER, Permission.TASK_VIEW)).toBe(true)
      expect(hasPermission(Role.VIEWER, Permission.TASK_CREATE)).toBe(false)

      // ADMIN can view and modify
      expect(hasPermission(Role.ADMIN, Permission.TASK_VIEW)).toBe(true)
      expect(hasPermission(Role.ADMIN, Permission.TASK_CREATE)).toBe(true)
      expect(hasPermission(Role.ADMIN, Permission.AUDIT_VIEW)).toBe(true)

      // OWNER has all permissions
      expect(hasPermission(Role.OWNER, Permission.TASK_VIEW)).toBe(true)
      expect(hasPermission(Role.OWNER, Permission.TASK_CREATE)).toBe(true)
      expect(hasPermission(Role.OWNER, Permission.AUDIT_VIEW)).toBe(true)
    })
  })

  describe('hasAnyPermission', () => {
    it('should return true if role has at least one of the required permissions', () => {
      expect(
        hasAnyPermission(Role.VIEWER, [
          Permission.TASK_VIEW,
          Permission.TASK_CREATE,
        ])
      ).toBe(true)

      expect(
        hasAnyPermission(Role.ADMIN, [
          Permission.TASK_CREATE,
          Permission.TASK_UPDATE,
        ])
      ).toBe(true)
    })

    it('should return false if role has none of the required permissions', () => {
      expect(
        hasAnyPermission(Role.VIEWER, [
          Permission.TASK_CREATE,
          Permission.TASK_DELETE,
        ])
      ).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    it('should return true if role has all required permissions', () => {
      expect(
        hasAllPermissions(Role.ADMIN, [
          Permission.TASK_VIEW,
          Permission.TASK_CREATE,
        ])
      ).toBe(true)

      expect(
        hasAllPermissions(Role.OWNER, [
          Permission.TASK_VIEW,
          Permission.AUDIT_VIEW,
        ])
      ).toBe(true)
    })

    it('should return false if role is missing any required permission', () => {
      expect(
        hasAllPermissions(Role.VIEWER, [
          Permission.TASK_VIEW,
          Permission.TASK_CREATE,
        ])
      ).toBe(false)

      expect(
        hasAllPermissions(Role.ADMIN, [
          Permission.TASK_VIEW,
          Permission.TASK_CREATE,
          Permission.TASK_VIEW,
        ])
      ).toBe(true)
    })
  })

  describe('Permission inheritance validation', () => {
    it('should validate that ADMIN has all VIEWER permissions', () => {
      const viewerPerms = ROLE_PERMISSIONS[Role.VIEWER]

      viewerPerms.forEach((permission) => {
        expect(hasPermission(Role.ADMIN, permission)).toBe(true)
      })
    })

    it('should validate that OWNER has all ADMIN permissions', () => {
      const adminPerms = ROLE_PERMISSIONS[Role.ADMIN]

      adminPerms.forEach((permission) => {
        expect(hasPermission(Role.OWNER, permission)).toBe(true)
      })
    })

    it('should validate that OWNER has all VIEWER permissions', () => {
      const viewerPerms = ROLE_PERMISSIONS[Role.VIEWER]

      viewerPerms.forEach((permission) => {
        expect(hasPermission(Role.OWNER, permission)).toBe(true)
      })
    })
  })
})
