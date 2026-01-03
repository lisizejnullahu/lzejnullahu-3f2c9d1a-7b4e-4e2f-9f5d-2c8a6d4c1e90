import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AuditLogService } from './audit-log.service'
import { AuditLog } from '../entities/audit-log.entity'
import { User } from '../entities/user.entity'
import { Role } from '@secure-task-management/data'

describe('AuditLogService - Access Control', () => {
  let service: AuditLogService
  let mockAuditLogRepository: any
  let mockUserRepository: any

  beforeEach(async () => {
    mockAuditLogRepository = {
      createQueryBuilder: jest.fn(),
    }

    mockUserRepository = {
      findOne: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
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

    service = module.get<AuditLogService>(AuditLogService)
  })

  it('should allow Owner to view audit logs from their org', async () => {
    const ownerUser = {
      userId: 1,
      email: 'owner@test.com',
      role: Role.OWNER,
      organizationId: 1,
      parentOrganizationId: 1,
    }

    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          action: 'CREATE',
          entityType: 'Task',
          user: { name: 'Alice' },
          organizationId: 1,
        },
      ]),
    }

    mockAuditLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

    const result = await service.findAll(ownerUser)

    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      'auditLog.organizationId IN (:...orgIds)',
      { orgIds: [1] }
    )
    expect(result).toHaveLength(1)
    expect(result[0].action).toBe('CREATE')
  })

  it('should allow Admin to view audit logs from their org', async () => {
    const adminUser = {
      userId: 2,
      email: 'admin@test.com',
      role: Role.ADMIN,
      organizationId: 2,
      parentOrganizationId: undefined,
    }

    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 2,
          action: 'UPDATE',
          entityType: 'Task',
          user: { name: 'Bob' },
          organizationId: 2,
        },
      ]),
    }

    mockAuditLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

    const result = await service.findAll(adminUser)

    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      'auditLog.organizationId IN (:...orgIds)',
      { orgIds: [2] }
    )
    expect(result).toHaveLength(1)
  })

  it('should scope audit logs to accessible organizations', async () => {
    const ownerUser = {
      userId: 1,
      email: 'owner@test.com',
      role: Role.OWNER,
      organizationId: 1,
      parentOrganizationId: 1,
    }

    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }

    mockAuditLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

    await service.findAll(ownerUser)

    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      'auditLog.organizationId IN (:...orgIds)',
      expect.objectContaining({ orgIds: expect.any(Array) })
    )
  })
})
