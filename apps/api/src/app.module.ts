import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AppController } from './app.controller'
import { AuthModule } from './auth/auth.module'
import { TasksModule } from './tasks/tasks.module'
import { AuditLogModule } from './audit-log/audit-log.module'
import { Organization } from './entities/organization.entity'
import { User } from './entities/user.entity'
import { Task } from './entities/task.entity'
import { AuditLog } from './entities/audit-log.entity'

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'database.db',
      entities: [Organization, User, Task, AuditLog],
      synchronize: true,
    }),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: { expiresIn: '24h' },
    }),
    AuthModule,
    TasksModule,
    AuditLogModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
