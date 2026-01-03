import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm'
import { TaskStatus, TaskCategory } from '@secure-task-management/data'
import { User } from './user.entity'
import { Organization } from './organization.entity'

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  title: string

  @Column({ nullable: true })
  description: string

  @Column({
    type: 'text',
    enum: TaskCategory,
  })
  category: TaskCategory

  @Column({
    type: 'text',
    enum: TaskStatus,
  })
  status: TaskStatus

  @Column({ default: 0 })
  orderIndex: number

  @Column({ type: 'datetime', nullable: true })
  dueDate: Date

  @Column()
  orgId: number

  @ManyToOne(() => Organization, (org) => org.tasks)
  organization: Organization

  @Column()
  createdBy: number

  @ManyToOne(() => User, (user) => user.tasks)
  creator: User

  @Column({ nullable: true })
  updatedBy: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
