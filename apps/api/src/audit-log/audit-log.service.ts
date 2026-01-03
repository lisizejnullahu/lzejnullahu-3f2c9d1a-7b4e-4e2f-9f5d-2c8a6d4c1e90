import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLog } from '../entities/audit-log.entity'
import { User } from '../entities/user.entity'
import { AuditLogResponseDto, RequestUser } from '@secure-task-management/data'
import { getAccessibleOrgIdsFromUser } from '@secure-task-management/auth'

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async findAll(user: RequestUser): Promise<AuditLogResponseDto[]> {
    const accessibleOrgIds = getAccessibleOrgIdsFromUser(user)

    const auditLogs = await this.auditLogRepository
      .createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.user', 'user')
      .where('auditLog.organizationId IN (:...orgIds)', {
        orgIds: accessibleOrgIds,
      })
      .orderBy('auditLog.ts', 'DESC')
      .getMany()

    return auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.resource,
      entityId: log.resourceId,
      userId: log.userId,
      userName: log.user?.name || 'Unknown',
      organizationId: user.organizationId,
      allowed: log.allowed,
      reason: log.reason,
      metadata: log.meta,
      createdAt: log.ts,
    }))
  }
}
