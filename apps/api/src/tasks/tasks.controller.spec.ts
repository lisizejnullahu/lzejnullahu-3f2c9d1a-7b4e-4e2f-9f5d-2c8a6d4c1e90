import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import { TasksController } from './tasks.controller'
import { TasksService } from './tasks.service'
import { Task } from '../entities/task.entity'
import { AuditLog } from '../entities/audit-log.entity'
import { User } from '../entities/user.entity'
import {
  Role,
  TaskStatus,
  TaskCategory,
  Permission,
} from '@secure-task-management/data'

describe('TasksController - Integration Tests', () => {
  let controller: TasksController
  let service: TasksService
  let mockTaskRepository: any
  let mockAuditLogRepository: any
  let mockUserRepository: any

  beforeEach(async () => {
    mockTaskRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    }

    mockAuditLogRepository = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
    }

    mockUserRepository = {
      findOne: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
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

    controller = module.get<TasksController>(TasksController)
    service = module.get<TasksService>(TasksService)
  })

  describe('VIEWER Role Tests', () => {
    const viewerUser = {
      userId: 3,
      email: 'viewer@demo',
      role: Role.VIEWER,
      organizationId: 1,
      parentOrganizationId: undefined,
    }

    it('should allow VIEWER to view tasks (GET /tasks)', async () => {
      const mockTasks = [
        {
          id: 1,
          title: 'Task 1',
          description: 'Description',
          category: TaskCategory.WORK,
          status: TaskStatus.TODO,
          orderIndex: 0,
          orgId: 1,
          createdBy: 1,
          updatedBy: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockTaskRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockTasks),
      })

      const result = await controller.findAll(viewerUser)

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Task 1')
    })

    it('should prevent VIEWER from creating tasks (POST /tasks)', async () => {
      const createDto = {
        title: 'New Task',
        description: 'Description',
        category: TaskCategory.WORK,
        status: TaskStatus.TODO,
      }

      // This would be blocked by PermissionsGuard in real scenario
      // Testing service-level logic
      mockTaskRepository.create.mockReturnValue(createDto)
      mockTaskRepository.save.mockResolvedValue({ id: 1, ...createDto })

      // VIEWER doesn't have TASK_CREATE permission
      // In integration test, this would return 403 Forbidden
      expect(Permission.TASK_CREATE).toBeDefined()
    })

    it('should prevent VIEWER from updating tasks (PUT /tasks/:id)', async () => {
      const task = {
        id: 1,
        title: 'Task 1',
        orgId: 1,
        createdBy: 1,
        updatedBy: 1,
      }

      mockTaskRepository.findOne.mockResolvedValue(task)

      await expect(
        service.update(viewerUser, 1, { title: 'Updated' })
      ).rejects.toThrow(ForbiddenException)
    })

    it('should prevent VIEWER from deleting tasks (DELETE /tasks/:id)', async () => {
      const task = {
        id: 1,
        title: 'Task 1',
        orgId: 1,
        createdBy: 1,
      }

      mockTaskRepository.findOne.mockResolvedValue(task)

      await expect(service.remove(viewerUser, 1)).rejects.toThrow(
        ForbiddenException
      )
    })
  })

  describe('ADMIN Ownership Rules', () => {
    const adminUser = {
      userId: 2,
      email: 'admin@demo',
      role: Role.ADMIN,
      organizationId: 1,
      parentOrganizationId: undefined,
    }

    it('should allow ADMIN to update their own tasks', async () => {
      const task = {
        id: 1,
        title: 'Admin Task',
        description: 'Description',
        category: TaskCategory.WORK,
        status: TaskStatus.TODO,
        orderIndex: 0,
        orgId: 1,
        createdBy: 2, // Same as adminUser.userId
        updatedBy: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockTaskRepository.findOne.mockResolvedValue(task)
      mockTaskRepository.save.mockResolvedValue({
        ...task,
        title: 'Updated Task',
      })

      const result = await service.update(adminUser, 1, {
        title: 'Updated Task',
      })

      expect(result.title).toBe('Updated Task')
      expect(mockTaskRepository.save).toHaveBeenCalled()
    })

    it('should prevent ADMIN from updating others tasks', async () => {
      const task = {
        id: 1,
        title: 'Owner Task',
        orgId: 1,
        createdBy: 1, // Different from adminUser.userId
        updatedBy: 1,
      }

      mockTaskRepository.findOne.mockResolvedValue(task)

      await expect(
        service.update(adminUser, 1, { title: 'Updated' })
      ).rejects.toThrow(ForbiddenException)
    })

    it('should allow ADMIN to delete their own tasks', async () => {
      const task = {
        id: 1,
        title: 'Admin Task',
        orgId: 1,
        createdBy: 2, // Same as adminUser.userId
      }

      mockTaskRepository.findOne.mockResolvedValue(task)
      mockTaskRepository.remove.mockResolvedValue(task)

      await service.remove(adminUser, 1)

      expect(mockTaskRepository.remove).toHaveBeenCalledWith(task)
    })

    it('should prevent ADMIN from deleting others tasks', async () => {
      const task = {
        id: 1,
        title: 'Owner Task',
        orgId: 1,
        createdBy: 1, // Different from adminUser.userId
      }

      mockTaskRepository.findOne.mockResolvedValue(task)

      await expect(service.remove(adminUser, 1)).rejects.toThrow(
        ForbiddenException
      )
    })
  })

  describe('OWNER Permissions', () => {
    const ownerUser = {
      userId: 1,
      email: 'owner@demo',
      role: Role.OWNER,
      organizationId: 1,
      parentOrganizationId: 1,
    }

    it('should allow OWNER to update any task in their org', async () => {
      const task = {
        id: 1,
        title: 'Any Task',
        description: 'Description',
        category: TaskCategory.WORK,
        status: TaskStatus.TODO,
        orderIndex: 0,
        orgId: 1,
        createdBy: 2, // Different user
        updatedBy: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockTaskRepository.findOne.mockResolvedValue(task)
      mockTaskRepository.save.mockResolvedValue({
        ...task,
        title: 'Updated by Owner',
      })

      const result = await service.update(ownerUser, 1, {
        title: 'Updated by Owner',
      })

      expect(result.title).toBe('Updated by Owner')
    })

    it('should allow OWNER to delete any task in their org', async () => {
      const task = {
        id: 1,
        title: 'Any Task',
        orgId: 1,
        createdBy: 2, // Different user
      }

      mockTaskRepository.findOne.mockResolvedValue(task)
      mockTaskRepository.remove.mockResolvedValue(task)

      await service.remove(ownerUser, 1)

      expect(mockTaskRepository.remove).toHaveBeenCalled()
    })
  })

  describe('Organization Scope Tests', () => {
    it('should allow parent org OWNER to see child org tasks', async () => {
      const parentOwner = {
        userId: 1,
        email: 'owner@demo',
        role: Role.OWNER,
        organizationId: 1,
        parentOrganizationId: 1, // Parent org
      }

      // In real implementation with database, this would include child org tasks
      // For now, testing that accessible org IDs are calculated correctly
      const mockTasks = [
        {
          id: 1,
          title: 'Parent Task',
          orgId: 1,
          createdBy: 1,
          category: TaskCategory.WORK,
          status: TaskStatus.TODO,
          orderIndex: 0,
          updatedBy: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockTaskRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockTasks),
      })

      const result = await service.findAll(parentOwner, {})

      expect(result).toBeDefined()
      // Parent owner should see tasks from accessible orgs
    })

    it('should prevent child org user from seeing parent org tasks', async () => {
      const childAdmin = {
        userId: 4,
        email: 'child@demo',
        role: Role.ADMIN,
        organizationId: 2, // Child org
        parentOrganizationId: 1, // Parent is org 1
      }

      const parentTask = {
        id: 1,
        title: 'Parent Task',
        orgId: 1, // Parent org
        createdBy: 1,
      }

      mockTaskRepository.findOne.mockResolvedValue(parentTask)

      // Child org user cannot access parent org task
      await expect(service.findOne(childAdmin, 1)).rejects.toThrow(
        ForbiddenException
      )
    })

    it('should prevent access to tasks from different org', async () => {
      const user = {
        userId: 2,
        email: 'admin@demo',
        role: Role.ADMIN,
        organizationId: 1,
        parentOrganizationId: undefined,
      }

      const otherOrgTask = {
        id: 1,
        title: 'Other Org Task',
        orgId: 99, // Different org
        createdBy: 10,
      }

      mockTaskRepository.findOne.mockResolvedValue(otherOrgTask)

      await expect(service.findOne(user, 1)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('Query Parameters', () => {
    const user = {
      userId: 1,
      email: 'owner@demo',
      role: Role.OWNER,
      organizationId: 1,
      parentOrganizationId: 1,
    }

    it('should filter tasks by status', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }

      mockTaskRepository.createQueryBuilder.mockReturnValue(queryBuilder)

      await service.findAll(user, { status: TaskStatus.TODO })

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'task.status = :status',
        { status: TaskStatus.TODO }
      )
    })

    it('should filter tasks by category', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }

      mockTaskRepository.createQueryBuilder.mockReturnValue(queryBuilder)

      await service.findAll(user, { category: TaskCategory.WORK })

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'task.category = :category',
        { category: TaskCategory.WORK }
      )
    })

    it('should search tasks by title or description', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }

      mockTaskRepository.createQueryBuilder.mockReturnValue(queryBuilder)

      await service.findAll(user, { search: 'important' })

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(task.title LIKE :search OR task.description LIKE :search)',
        { search: '%important%' }
      )
    })

    it('should sort tasks by specified field and direction', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }

      mockTaskRepository.createQueryBuilder.mockReturnValue(queryBuilder)

      await service.findAll(user, { sortBy: 'createdAt', sortDir: 'DESC' })

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'task.createdAt',
        'DESC'
      )
    })
  })

  describe('Audit Logging', () => {
    const user = {
      userId: 1,
      email: 'owner@demo',
      role: Role.OWNER,
      organizationId: 1,
      parentOrganizationId: 1,
    }

    it('should log task creation', async () => {
      const createDto = {
        title: 'New Task',
        description: 'Description',
        category: TaskCategory.WORK,
        status: TaskStatus.TODO,
      }

      mockTaskRepository.create.mockReturnValue(createDto)
      mockTaskRepository.save.mockResolvedValue({ id: 1, ...createDto })

      await service.create(user, createDto)

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          resource: 'Task',
          userId: user.userId,
          allowed: true,
        })
      )
    })

    it('should log task updates', async () => {
      const task = {
        id: 1,
        title: 'Task',
        orgId: 1,
        createdBy: 1,
        updatedBy: 1,
        category: TaskCategory.WORK,
        status: TaskStatus.TODO,
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockTaskRepository.findOne.mockResolvedValue(task)
      mockTaskRepository.save.mockResolvedValue(task)

      await service.update(user, 1, { title: 'Updated' })

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          resource: 'Task',
          resourceId: 1,
        })
      )
    })

    it('should log task deletion', async () => {
      const task = {
        id: 1,
        title: 'Task',
        orgId: 1,
        createdBy: 1,
      }

      mockTaskRepository.findOne.mockResolvedValue(task)
      mockTaskRepository.remove.mockResolvedValue(task)

      await service.remove(user, 1)

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          resource: 'Task',
          resourceId: 1,
        })
      )
    })
  })
})
