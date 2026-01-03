import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm'
import { User } from './user.entity'

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  ts: Date

  @Column()
  userId: number

  @ManyToOne(() => User, (user) => user.auditLogs)
  user: User

  @Column()
  action: string

  @Column()
  resource: string

  @Column()
  resourceId: number

  @Column({ default: true })
  allowed: boolean

  @Column({ nullable: true })
  reason: string

  @Column({ type: 'simple-json', nullable: true })
  meta: any
}
