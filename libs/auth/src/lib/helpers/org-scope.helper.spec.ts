import { Role, RequestUser } from '@secure-task-management/data'
import {
  getAccessibleOrgIds,
  getAccessibleOrgIdsFromUser,
  canAccessResource,
  canModifyResource,
  enforceOrgScope,
} from './org-scope.helper'

describe('OrgScopeHelper', () => {
  describe('getAccessibleOrgIds', () => {
    it('should return only user org for non-parent org users', () => {
      const orgIds = getAccessibleOrgIds(2, undefined, Role.ADMIN)
      expect(orgIds).toEqual([2])
    })

    it('should return only user org for ADMIN in any org', () => {
      const orgIds = getAccessibleOrgIds(1, 1, Role.ADMIN)
      expect(orgIds).toEqual([1])
    })

    it('should return only user org for VIEWER', () => {
      const orgIds = getAccessibleOrgIds(1, 1, Role.VIEWER)
      expect(orgIds).toEqual([1])
    })

    it('should return user org for OWNER in parent org', () => {
      // OWNER in parent org (parentOrganizationId === userOrgId means it's a parent)
      const orgIds = getAccessibleOrgIds(1, 1, Role.OWNER)
      expect(orgIds).toEqual([1])
      // Note: In production, this would include child org IDs
    })

    it('should return only user org for OWNER in child org', () => {
      // OWNER in child org (parentOrganizationId !== userOrgId)
      const orgIds = getAccessibleOrgIds(2, 1, Role.OWNER)
      expect(orgIds).toEqual([2])
    })
  })

  describe('getAccessibleOrgIdsFromUser', () => {
    it('should extract org IDs from RequestUser object', () => {
      const user: RequestUser = {
        userId: 1,
        email: 'admin@demo',
        role: Role.ADMIN,
        organizationId: 2,
        parentOrganizationId: 1,
      }

      const orgIds = getAccessibleOrgIdsFromUser(user)
      expect(orgIds).toEqual([2])
    })

    it('should handle OWNER in parent org', () => {
      const user: RequestUser = {
        userId: 1,
        email: 'owner@demo',
        role: Role.OWNER,
        organizationId: 1,
        parentOrganizationId: 1,
      }

      const orgIds = getAccessibleOrgIdsFromUser(user)
      expect(orgIds).toEqual([1])
    })

    it('should handle VIEWER', () => {
      const user: RequestUser = {
        userId: 3,
        email: 'viewer@demo',
        role: Role.VIEWER,
        organizationId: 1,
        parentOrganizationId: undefined,
      }

      const orgIds = getAccessibleOrgIdsFromUser(user)
      expect(orgIds).toEqual([1])
    })
  })

  describe('canAccessResource', () => {
    it('should allow access when resource is in user org', () => {
      const user: RequestUser = {
        userId: 1,
        email: 'admin@demo',
        role: Role.ADMIN,
        organizationId: 1,
        parentOrganizationId: undefined,
      }

      expect(canAccessResource(user, 1)).toBe(true)
    })

    it('should deny access when resource is in different org', () => {
      const user: RequestUser = {
        userId: 1,
        email: 'admin@demo',
        role: Role.ADMIN,
        organizationId: 1,
        parentOrganizationId: undefined,
      }

      expect(canAccessResource(user, 2)).toBe(false)
    })

    it('should allow OWNER in parent org to access parent org resources', () => {
      const user: RequestUser = {
        userId: 1,
        email: 'owner@demo',
        role: Role.OWNER,
        organizationId: 1,
        parentOrganizationId: 1,
      }

      expect(canAccessResource(user, 1)).toBe(true)
    })
  })

  describe('canModifyResource', () => {
    it('should allow ADMIN to modify resources in their org', () => {
      const user: RequestUser = {
        userId: 2,
        email: 'admin@demo',
        role: Role.ADMIN,
        organizationId: 1,
        parentOrganizationId: undefined,
      }

      expect(canModifyResource(user, 1, 2)).toBe(true)
    })

    it('should deny VIEWER from modifying any resources', () => {
      const user: RequestUser = {
        userId: 3,
        email: 'viewer@demo',
        role: Role.VIEWER,
        organizationId: 1,
        parentOrganizationId: undefined,
      }

      expect(canModifyResource(user, 1)).toBe(false)
    })

    it('should deny modification of resources in different org', () => {
      const user: RequestUser = {
        userId: 2,
        email: 'admin@demo',
        role: Role.ADMIN,
        organizationId: 1,
        parentOrganizationId: undefined,
      }

      expect(canModifyResource(user, 2)).toBe(false)
    })

    it('should allow OWNER to modify resources in their org', () => {
      const user: RequestUser = {
        userId: 1,
        email: 'owner@demo',
        role: Role.OWNER,
        organizationId: 1,
        parentOrganizationId: 1,
      }

      expect(canModifyResource(user, 1)).toBe(true)
    })
  })

  describe('enforceOrgScope', () => {
    it('should not throw when resource is in accessible org', () => {
      const user: RequestUser = {
        userId: 1,
        email: 'admin@demo',
        role: Role.ADMIN,
        organizationId: 1,
        parentOrganizationId: undefined,
      }

      expect(() => enforceOrgScope(user, 1)).not.toThrow()
    })

    it('should throw when resource is not in accessible org', () => {
      const user: RequestUser = {
        userId: 1,
        email: 'admin@demo',
        role: Role.ADMIN,
        organizationId: 1,
        parentOrganizationId: undefined,
      }

      expect(() => enforceOrgScope(user, 2)).toThrow('Access denied')
      expect(() => enforceOrgScope(user, 2)).toThrow(
        'Resource org 2 not in accessible orgs [1]'
      )
    })

    it('should provide helpful error message with org IDs', () => {
      const user: RequestUser = {
        userId: 1,
        email: 'admin@demo',
        role: Role.ADMIN,
        organizationId: 1,
        parentOrganizationId: undefined,
      }

      try {
        enforceOrgScope(user, 99)
        fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).toContain('Resource org 99')
        expect(error.message).toContain('accessible orgs [1]')
      }
    })
  })

  describe('Org hierarchy scenarios', () => {
    it('should handle parent org OWNER accessing parent org resource', () => {
      const parentOwner: RequestUser = {
        userId: 1,
        email: 'owner@demo',
        role: Role.OWNER,
        organizationId: 1,
        parentOrganizationId: 1,
      }

      expect(canAccessResource(parentOwner, 1)).toBe(true)
      expect(canModifyResource(parentOwner, 1)).toBe(true)
    })

    it('should handle child org ADMIN accessing only child org resource', () => {
      const childAdmin: RequestUser = {
        userId: 4,
        email: 'child@demo',
        role: Role.ADMIN,
        organizationId: 2,
        parentOrganizationId: 1,
      }

      expect(canAccessResource(childAdmin, 2)).toBe(true)
      expect(canAccessResource(childAdmin, 1)).toBe(false)
      expect(canModifyResource(childAdmin, 2, 4)).toBe(true)
      expect(canModifyResource(childAdmin, 1, 4)).toBe(false)
    })

    it('should handle VIEWER in any org having read-only access', () => {
      const viewer: RequestUser = {
        userId: 3,
        email: 'viewer@demo',
        role: Role.VIEWER,
        organizationId: 1,
        parentOrganizationId: undefined,
      }

      expect(canAccessResource(viewer, 1)).toBe(true)
      expect(canModifyResource(viewer, 1)).toBe(false)
    })
  })
})
