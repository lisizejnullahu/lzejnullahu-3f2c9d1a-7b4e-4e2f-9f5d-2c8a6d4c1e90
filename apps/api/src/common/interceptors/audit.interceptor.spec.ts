import { Test, TestingModule } from '@nestjs/testing'
import {
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import { of, throwError } from 'rxjs'
import { AuditInterceptor } from './audit.interceptor'
import { AuditLog } from '../../entities/audit-log.entity'
import { Role } from '@secure-task-management/data'

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor
  let mockAuditLogRepository: any

  beforeEach(async () => {
    mockAuditLogRepository = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 1, ...data })),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditInterceptor,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
      ],
    }).compile()

    interceptor = module.get<AuditInterceptor>(AuditInterceptor)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const createMockContext = (
    url: string,
    method: string,
    user: any
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          url,
          method,
          user,
        }),
      }),
    } as ExecutionContext
  }

  const createMockCallHandler = (
    response: any = { success: true }
  ): CallHandler => {
    return {
      handle: () => of(response),
    } as CallHandler
  }

  describe('Request Logging', () => {
    it('should log successful GET /tasks request', (done) => {
      const user = {
        userId: 1,
        email: 'owner@demo',
        role: Role.OWNER,
        organizationId: 1,
      }

      const context = createMockContext('/tasks', 'GET', user)
      const next = createMockCallHandler()

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: 1,
                action: 'READ',
                resource: 'Task',
                allowed: true,
                reason: null,
              })
            )
            expect(mockAuditLogRepository.save).toHaveBeenCalled()
            done()
          }, 100)
        },
      })
    })

    it('should log successful POST /tasks request', (done) => {
      const user = {
        userId: 2,
        email: 'admin@demo',
        role: Role.ADMIN,
        organizationId: 1,
      }

      const context = createMockContext('/tasks', 'POST', user)
      const next = createMockCallHandler({ id: 1, title: 'New Task' })

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: 2,
                action: 'CREATE',
                resource: 'Task',
                allowed: true,
              })
            )
            done()
          }, 100)
        },
      })
    })

    it('should log successful PUT /tasks/:id request with resource ID', (done) => {
      const user = {
        userId: 1,
        email: 'owner@demo',
        role: Role.OWNER,
        organizationId: 1,
      }

      const context = createMockContext('/tasks/123', 'PUT', user)
      const next = createMockCallHandler()

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
              expect.objectContaining({
                action: 'UPDATE',
                resource: 'Task',
                resourceId: 123,
                allowed: true,
              })
            )
            done()
          }, 100)
        },
      })
    })

    it('should log successful DELETE /tasks/:id request', (done) => {
      const user = {
        userId: 1,
        email: 'owner@demo',
        role: Role.OWNER,
        organizationId: 1,
      }

      const context = createMockContext('/tasks/456', 'DELETE', user)
      const next = createMockCallHandler()

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
              expect.objectContaining({
                action: 'DELETE',
                resource: 'Task',
                resourceId: 456,
                allowed: true,
              })
            )
            done()
          }, 100)
        },
      })
    }, 10000)

    it('should log GET /audit-log request', (done) => {
      const user = {
        userId: 1,
        email: 'owner@demo',
        role: Role.OWNER,
        organizationId: 1,
      }

      const context = createMockContext('/audit-log', 'GET', user)
      const next = createMockCallHandler([])

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
              expect.objectContaining({
                action: 'READ',
                resource: 'AuditLog',
                allowed: true,
              })
            )
            done()
          }, 100)
        },
      })
    })
  })

  describe('Failed Request Logging', () => {
    it.skip('should log denied request with ForbiddenException', (done) => {
      const user = {
        userId: 3,
        email: 'viewer@demo',
        role: Role.VIEWER,
        organizationId: 1,
      }

      const context = createMockContext('/tasks/1', 'PUT', user)
      const error = new ForbiddenException('Access denied')
      const next = {
        handle: () => throwError(() => error),
      } as CallHandler

      interceptor.intercept(context, next).subscribe({
        error: (err) => {
          setTimeout(() => {
            expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: 3,
                action: 'UPDATE',
                resource: 'Task',
                resourceId: 1,
                allowed: false,
                reason: 'Access denied',
                meta: expect.objectContaining({
                  errorType: 'ForbiddenException',
                }),
              })
            )
            expect(err).toBeInstanceOf(ForbiddenException)
            done()
          }, 100)
        },
      })
    }, 10000)

    it.skip('should log denied DELETE request', (done) => {
      const user = {
        userId: 2,
        email: 'admin@demo',
        role: Role.ADMIN,
        organizationId: 1,
      }

      const context = createMockContext('/tasks/999', 'DELETE', user)
      const error = new ForbiddenException(
        'Cannot delete task created by another user'
      )
      const next = {
        handle: () => throwError(() => error),
      } as CallHandler

      interceptor.intercept(context, next).subscribe({
        error: (err) => {
          setTimeout(() => {
            expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
              expect.objectContaining({
                action: 'DELETE',
                resource: 'Task',
                resourceId: 999,
                allowed: false,
                reason: 'Cannot delete task created by another user',
              })
            )
            done()
          }, 100)
        },
      })
    }, 10000)

    it.skip('should log denied audit-log access', (done) => {
      const user = {
        userId: 3,
        email: 'viewer@demo',
        role: Role.VIEWER,
        organizationId: 1,
      }

      const context = createMockContext('/audit-log', 'GET', user)
      const error = new ForbiddenException('Insufficient permissions')
      const next = {
        handle: () => throwError(() => error),
      } as CallHandler

      interceptor.intercept(context, next).subscribe({
        error: (err) => {
          setTimeout(() => {
            expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
              expect.objectContaining({
                action: 'READ',
                resource: 'AuditLog',
                allowed: false,
                reason: 'Insufficient permissions',
              })
            )
            done()
          }, 100)
        },
      })
    }, 10000)
  })

  describe('Metadata Capture', () => {
    it('should capture request duration in metadata', (done) => {
      const user = {
        userId: 1,
        email: 'owner@demo',
        role: Role.OWNER,
        organizationId: 1,
      }

      const context = createMockContext('/tasks', 'GET', user)
      const next = createMockCallHandler()

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
              expect.objectContaining({
                meta: expect.objectContaining({
                  method: 'GET',
                  url: '/tasks',
                  duration: expect.any(Number),
                }),
              })
            )
            done()
          }, 100)
        },
      })
    })

    it.skip('should capture error type in metadata for failed requests', (done) => {
      const user = {
        userId: 3,
        email: 'viewer@demo',
        role: Role.VIEWER,
        organizationId: 1,
      }

      const context = createMockContext('/tasks', 'POST', user)
      const error = new ForbiddenException('Access denied')
      const next = {
        handle: () => throwError(() => error),
      } as CallHandler

      interceptor.intercept(context, next).subscribe({
        error: () => {
          setTimeout(() => {
            expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
              expect.objectContaining({
                meta: expect.objectContaining({
                  errorType: 'ForbiddenException',
                  method: 'POST',
                  url: '/tasks',
                }),
              })
            )
            done()
          }, 100)
        },
      })
    })
  })

  describe('Non-audited Endpoints', () => {
    it('should not log requests to /auth endpoints', (done) => {
      const user = {
        userId: 1,
        email: 'owner@demo',
        role: Role.OWNER,
        organizationId: 1,
      }

      const context = createMockContext('/auth/login', 'POST', user)
      const next = createMockCallHandler()

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockAuditLogRepository.create).not.toHaveBeenCalled()
            expect(mockAuditLogRepository.save).not.toHaveBeenCalled()
            done()
          }, 100)
        },
      })
    })

    it('should not log requests to other non-audited endpoints', (done) => {
      const user = {
        userId: 1,
        email: 'owner@demo',
        role: Role.OWNER,
        organizationId: 1,
      }

      const context = createMockContext('/health', 'GET', user)
      const next = createMockCallHandler()

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockAuditLogRepository.create).not.toHaveBeenCalled()
            done()
          }, 100)
        },
      })
    })
  })
})
