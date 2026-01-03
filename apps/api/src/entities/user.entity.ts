import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm'
import { Role } from '@secure-task-management/data'
import { Organization } from './organization.entity'
import { Task } from './task.entity'
import { AuditLog } from './audit-log.entity'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  email: string

  @Column()
  passwordHash: string

  @Column()
  name: string

  @Column({
    type: 'text',
    enum: Role,
  })
  role: Role

  @Column()
  orgId: number

  @ManyToOne(() => Organization, (org) => org.users)
  @JoinColumn({ name: 'orgId' })
  organization: Organization

  @OneToMany(() => Task, (task) => task.createdBy)
  tasks: Task[]

  @OneToMany(() => AuditLog, (log) => log.user)
  auditLogs: AuditLog[]

  @CreateDateColumn()
  createdAt: Date
}
