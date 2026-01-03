import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { TasksController } from './tasks.controller'
import { TasksService } from './tasks.service'
import { Task } from '../entities/task.entity'
import { AuditLog } from '../entities/audit-log.entity'
import { User } from '../entities/user.entity'
import { AuditInterceptor } from '../common/interceptors/audit.interceptor'

@Module({
  imports: [TypeOrmModule.forFeature([Task, AuditLog, User])],
  controllers: [TasksController],
  providers: [
    TasksService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class TasksModule {}
