import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import { TasksService } from './tasks.service'
import { Task } from '../entities/task.entity'
import { AuditLog } from '../entities/audit-log.entity'
import { User } from '../entities/user.entity'
import { Role, TaskStatus, TaskCategory } from '@secure-task-management/data'

describe('TasksService - RBAC and Org Scoping', () => {
  let service: TasksService
  let mockTaskRepository: any
  let mockAuditLogRepository: any
  let mockUserRepository: any

  beforeEach(async () => {
    mockTaskRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    }

    mockAuditLogRepository = {
      create: jest.fn(),
      save: jest.fn(),
    }

    mockUserRepository = {
      findOne: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile()

    service = module.get<TasksService>(TasksService)
  })

  describe('Org Scoping', () => {
    it('should allow Owner to access tasks from their org and child orgs', async () => {
      const ownerUser = {
        userId: 1,
        email: 'owner@test.com',
        role: Role.OWNER,
        organizationId: 1,
        parentOrganizationId: 1,
      }

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: 1, organizationId: 1, title: 'Task 1' },
          { id: 2, organizationId: 2, title: 'Task 2' },
        ]),
      }

      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      const result = await service.findAll(ownerUser, {})

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'task.orgId IN (:...orgIds)',
        { orgIds: [1] }
      )
      expect(result).toHaveLength(2)
    })

    it('should restrict Admin to only their org tasks', async () => {
      const adminUser = {
        userId: 2,
        email: 'admin@test.com',
        role: Role.ADMIN,
        organizationId: 2,
        parentOrganizationId: undefined,
      }

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([{ id: 3, organizationId: 2, title: 'Task 3' }]),
      }

      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      const result = await service.findAll(adminUser, {})

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'task.orgId IN (:...orgIds)',
        { orgIds: [2] }
      )
      expect(result).toHaveLength(1)
    })

    it('should deny access to task from different org', async () => {
      const viewerUser = {
        userId: 3,
        email: 'viewer@test.com',
        role: Role.VIEWER,
        organizationId: 1,
        parentOrganizationId: undefined,
      }

      mockTaskRepository.findOne.mockResolvedValue({
        id: 1,
        organizationId: 2,
        createdById: 5,
      })

      await expect(service.findOne(viewerUser, 1)).rejects.toThrow(
        ForbiddenException
      )
    })
  })

  describe('RBAC Permissions', () => {
    it('should allow Admin to modify tasks in their org', async () => {
      const adminUser = {
        userId: 2,
        email: 'admin@test.com',
        role: Role.ADMIN,
        organizationId: 1,
        parentOrganizationId: undefined,
      }

      const existingTask = {
        id: 1,
        orgId: 1,
        createdBy: 2,
        title: 'Old Title',
      }

      mockTaskRepository.findOne.mockResolvedValue(existingTask)
      mockTaskRepository.save.mockResolvedValue({
        ...existingTask,
        title: 'New Title',
      })
      mockAuditLogRepository.create.mockReturnValue({})
      mockAuditLogRepository.save.mockResolvedValue({})

      const result = await service.update(adminUser, 1, { title: 'New Title' })

      expect(result.title).toBe('New Title')
      expect(mockTaskRepository.save).toHaveBeenCalled()
    })

    it('should deny Viewer from modifying tasks', async () => {
      const viewerUser = {
        userId: 3,
        email: 'viewer@test.com',
        role: Role.VIEWER,
        organizationId: 1,
        parentOrganizationId: undefined,
      }

      mockTaskRepository.findOne.mockResolvedValue({
        id: 1,
        organizationId: 1,
        createdById: 2,
      })

      await expect(
        service.update(viewerUser, 1, { title: 'New Title' })
      ).rejects.toThrow(ForbiddenException)
    })

    it('should deny deletion of task from different org', async () => {
      const adminUser = {
        userId: 2,
        email: 'admin@test.com',
        role: Role.ADMIN,
        organizationId: 1,
        parentOrganizationId: undefined,
      }

      mockTaskRepository.findOne.mockResolvedValue({
        id: 1,
        organizationId: 2,
        createdById: 5,
      })

      await expect(service.remove(adminUser, 1)).rejects.toThrow(
        ForbiddenException
      )
    })
  })
})
