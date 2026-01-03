import { Controller, Get, UseGuards } from '@nestjs/common'
import { AuditLogService } from './audit-log.service'
import {
  AuditLogResponseDto,
  Permission,
  RequestUser,
} from '@secure-task-management/data'
import {
  JwtAuthGuard,
  RequirePermissions,
  PermissionsGuard,
  CurrentUser,
} from '@secure-task-management/auth'

@Controller('audit-log')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermissions(Permission.AUDIT_VIEW)
  async findAll(
    @CurrentUser() user: RequestUser
  ): Promise<AuditLogResponseDto[]> {
    return this.auditLogService.findAll(user)
  }
}
