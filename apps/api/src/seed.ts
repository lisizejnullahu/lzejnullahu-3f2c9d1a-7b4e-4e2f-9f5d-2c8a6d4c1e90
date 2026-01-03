import { DataSource } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { Organization } from './entities/organization.entity'
import { User } from './entities/user.entity'
import { Task } from './entities/task.entity'
import { AuditLog } from './entities/audit-log.entity'
import { Role, TaskStatus, TaskCategory } from '@secure-task-management/data'

async function seed() {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: 'database.db',
    entities: [Organization, User, Task, AuditLog],
    synchronize: true,
  })

  await dataSource.initialize()

  const orgRepo = dataSource.getRepository(Organization)
  const userRepo = dataSource.getRepository(User)
  const taskRepo = dataSource.getRepository(Task)

  // Clear existing data
  await taskRepo.clear()
  await userRepo.clear()
  await orgRepo.clear()

  const orgA = orgRepo.create({
    name: 'Org A',
    parentId: null,
  })
  await orgRepo.save(orgA)

  const orgB = orgRepo.create({
    name: 'Org B',
    parentId: orgA.id,
  })
  await orgRepo.save(orgB)

  const hashedPassword = await bcrypt.hash('Password123!', 10)

  const owner = userRepo.create({
    email: 'owner@demo',
    passwordHash: hashedPassword,
    name: 'Owner User',
    role: Role.OWNER,
    orgId: orgA.id,
  })
  await userRepo.save(owner)

  const admin = userRepo.create({
    email: 'admin@demo',
    passwordHash: hashedPassword,
    name: 'Admin User',
    role: Role.ADMIN,
    orgId: orgA.id,
  })
  await userRepo.save(admin)

  const viewer = userRepo.create({
    email: 'viewer@demo',
    passwordHash: hashedPassword,
    name: 'Viewer User',
    role: Role.VIEWER,
    orgId: orgA.id,
  })
  await userRepo.save(viewer)

  const childUser = userRepo.create({
    email: 'child@demo',
    passwordHash: hashedPassword,
    name: 'Child Org User',
    role: Role.ADMIN,
    orgId: orgB.id,
  })
  await userRepo.save(childUser)

  const task1 = taskRepo.create({
    title: 'Review Q4 Reports',
    description: 'Analyze quarterly performance metrics',
    category: TaskCategory.WORK,
    status: TaskStatus.TODO,
    orderIndex: 0,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    orgId: orgA.id,
    createdBy: owner.id,
  })
  await taskRepo.save(task1)

  const task2 = taskRepo.create({
    title: 'Update Security Policies',
    description: 'Review and update company security guidelines',
    category: TaskCategory.URGENT,
    status: TaskStatus.IN_PROGRESS,
    orderIndex: 1,
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    orgId: orgA.id,
    createdBy: admin.id,
  })
  await taskRepo.save(task2)

  const task3 = taskRepo.create({
    title: 'Team Meeting Preparation',
    description: 'Prepare agenda for monthly team sync',
    category: TaskCategory.WORK,
    status: TaskStatus.TODO,
    orderIndex: 2,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    orgId: orgB.id,
    createdBy: childUser.id,
  })
  await taskRepo.save(task3)

  console.log('✅ Seed data created successfully!')
  console.log('\n=== Sample Credentials ===')
  console.log(
    'Email: owner@demo    | Password: Password123! | Role: OWNER  | Org: A (parent)'
  )
  console.log(
    'Email: admin@demo    | Password: Password123! | Role: ADMIN  | Org: A (parent)'
  )
  console.log(
    'Email: viewer@demo   | Password: Password123! | Role: VIEWER | Org: A (parent)'
  )
  console.log(
    'Email: child@demo    | Password: Password123! | Role: ADMIN  | Org: B (child of A)'
  )
  console.log('\n=== Organizations ===')
  console.log(`Org A (ID: ${orgA.id}) - Parent organization`)
  console.log(`Org B (ID: ${orgB.id}) - Child of Org A`)

  await dataSource.destroy()
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error)
  process.exit(1)
})
