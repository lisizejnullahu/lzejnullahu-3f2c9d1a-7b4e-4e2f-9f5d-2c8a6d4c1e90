import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common'
import { Observable, throwError } from 'rxjs'
import { tap, catchError } from 'rxjs/operators'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLog } from '../../entities/audit-log.entity'

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const { method, url, user } = request

    // Only audit /tasks and /audit-log endpoints
    if (!url.includes('/tasks') && !url.includes('/audit-log')) {
      return next.handle()
    }

    const startTime = Date.now()
    const action = this.getActionFromMethod(method)
    const resource = this.getResourceFromUrl(url)
    const resourceId = this.extractResourceId(url)

    return next.handle().pipe(
      tap(async () => {
        // Request succeeded - log as allowed
        if (user) {
          await this.createAuditLog({
            ts: new Date(),
            userId: user.userId,
            action,
            resource,
            resourceId: resourceId || 0,
            allowed: true,
            reason: null,
            meta: {
              method,
              url,
              duration: Date.now() - startTime,
            },
          })
        }
      }),
      catchError(async (error) => {
        // Request failed - log as denied with reason
        const isDenied =
          error instanceof ForbiddenException ||
          error instanceof UnauthorizedException

        if (user && isDenied) {
          await this.createAuditLog({
            ts: new Date(),
            userId: user.userId,
            action,
            resource,
            resourceId: resourceId || 0,
            allowed: false,
            reason: error.message || 'Access denied',
            meta: {
              method,
              url,
              errorType: error.constructor.name,
              duration: Date.now() - startTime,
            },
          })
        }

        return throwError(() => error)
      })
    )
  }

  private getActionFromMethod(method: string): string {
    const actionMap: Record<string, string> = {
      GET: 'READ',
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    }
    return actionMap[method] || method
  }

  private getResourceFromUrl(url: string): string {
    if (url.includes('/tasks')) return 'Task'
    if (url.includes('/audit-log')) return 'AuditLog'
    return 'Unknown'
  }

  private extractResourceId(url: string): number | null {
    // Extract ID from URLs like /tasks/123
    const match = url.match(/\/(\d+)(?:\?|$)/)
    return match ? parseInt(match[1], 10) : null
  }

  private async createAuditLog(data: {
    ts: Date
    userId: number
    action: string
    resource: string
    resourceId: number
    allowed: boolean
    reason: string | null
    meta: any
  }): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create(data)
      await this.auditLogRepository.save(auditLog)
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to create audit log:', error)
    }
  }
}
