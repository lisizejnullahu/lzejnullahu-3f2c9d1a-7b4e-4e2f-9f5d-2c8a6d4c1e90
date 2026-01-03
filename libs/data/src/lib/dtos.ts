import { Role, TaskStatus, TaskCategory } from './enums'

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  email: string
  password: string
  name: string
  organizationId: number
  role: Role
}

export interface CreateTaskDto {
  title: string
  description?: string
  status: TaskStatus
  category: TaskCategory
  dueDate?: Date
  order?: number
}

export interface UpdateTaskDto {
  title?: string
  description?: string
  status?: TaskStatus
  category?: TaskCategory
  dueDate?: Date
  order?: number
}

export interface TaskResponseDto {
  id: number
  title: string
  description?: string
  status: TaskStatus
  category: TaskCategory
  dueDate?: Date
  order: number
  createdById: number
  organizationId: number
  createdAt: Date
  updatedAt: Date
}

export interface UserResponseDto {
  id: number
  email: string
  name: string
  role: Role
  organizationId: number
  createdAt: Date
}

export interface LoginResponseDto {
  accessToken: string
  user: UserResponseDto
}

export interface AuditLogResponseDto {
  id: number
  action: string
  entityType: string
  entityId: number
  userId: number
  userName: string
  organizationId: number
  allowed: boolean
  reason: string | null
  metadata?: any
  createdAt: Date
}

export interface OrganizationResponseDto {
  id: number
  name: string
  parentId?: number
  createdAt: Date
}
