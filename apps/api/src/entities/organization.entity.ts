import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
} from 'typeorm'
import { User } from './user.entity'
import { Task } from './task.entity'

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column({ nullable: true })
  parentId: number

  @ManyToOne(() => Organization, { nullable: true })
  parent: Organization

  @OneToMany(() => Organization, (org) => org.parent)
  children: Organization[]

  @OneToMany(() => User, (user) => user.organization)
  users: User[]

  @OneToMany(() => Task, (task) => task.organization)
  tasks: Task[]
}
