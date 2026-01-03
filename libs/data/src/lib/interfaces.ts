import { Role, Permission } from './enums'

export interface JwtPayload {
  sub: number
  email: string
  role: Role
  organizationId: number
  parentOrganizationId?: number
}

export interface RequestUser {
  userId: number
  email: string
  role: Role
  organizationId: number
  parentOrganizationId?: number
}

export interface RolePermissions {
  [key: string]: Permission[]
}
