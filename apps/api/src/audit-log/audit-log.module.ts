import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { AuditLogController } from './audit-log.controller'
import { AuditLogService } from './audit-log.service'
import { AuditLog } from '../entities/audit-log.entity'
import { User } from '../entities/user.entity'
import { AuditInterceptor } from '../common/interceptors/audit.interceptor'

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, User])],
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AuditLogModule {}
