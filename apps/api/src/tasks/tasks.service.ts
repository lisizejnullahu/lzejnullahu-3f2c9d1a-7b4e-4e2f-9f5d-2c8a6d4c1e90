import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { Task } from '../entities/task.entity'
import { AuditLog } from '../entities/audit-log.entity'
import { User } from '../entities/user.entity'
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskResponseDto,
  RequestUser,
} from '@secure-task-management/data'
import {
  getAccessibleOrgIdsFromUser,
  canModifyResource,
} from '@secure-task-management/auth'

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async findAll(
    user: RequestUser,
    filters: {
      status?: string
      category?: string
      search?: string
      sortBy?: string
      sortDir?: 'ASC' | 'DESC'
    }
  ): Promise<TaskResponseDto[]> {
    const accessibleOrgIds = getAccessibleOrgIdsFromUser(user)

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .where('task.orgId IN (:...orgIds)', {
        orgIds: accessibleOrgIds,
      })

    if (filters.status) {
      queryBuilder.andWhere('task.status = :status', { status: filters.status })
    }

    if (filters.category) {
      queryBuilder.andWhere('task.category = :category', {
        category: filters.category,
      })
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(task.title LIKE :search OR task.description LIKE :search)',
        { search: `%${filters.search}%` }
      )
    }

    const sortDir = filters.sortDir || 'ASC'
    if (filters.sortBy === 'createdAt') {
      queryBuilder.orderBy('task.createdAt', sortDir)
    } else if (filters.sortBy === 'updatedAt') {
      queryBuilder.orderBy('task.updatedAt', sortDir)
    } else if (filters.sortBy === 'title') {
      queryBuilder.orderBy('task.title', sortDir)
    } else if (filters.sortBy === 'dueDate') {
      queryBuilder.orderBy('task.dueDate', sortDir)
    } else {
      queryBuilder.orderBy('task.orderIndex', sortDir)
    }

    const tasks = await queryBuilder.getMany()
    return tasks.map(this.mapToResponseDto)
  }

  async findOne(user: RequestUser, id: number): Promise<TaskResponseDto> {
    const task = await this.taskRepository.findOne({ where: { id } })

    if (!task) {
      throw new NotFoundException('Task not found')
    }

    const accessibleOrgIds = getAccessibleOrgIdsFromUser(user)
    if (!accessibleOrgIds.includes(task.orgId)) {
      throw new ForbiddenException('Access denied')
    }

    return this.mapToResponseDto(task)
  }

  async create(
    user: RequestUser,
    createTaskDto: CreateTaskDto
  ): Promise<TaskResponseDto> {
    // Validate orgId is in accessible orgs (defaults to user's org if not provided)
    const targetOrgId = user.organizationId
    const accessibleOrgIds = getAccessibleOrgIdsFromUser(user)

    if (!accessibleOrgIds.includes(targetOrgId)) {
      throw new ForbiddenException(
        'Cannot create task in inaccessible organization'
      )
    }

    const task = this.taskRepository.create({
      ...createTaskDto,
      createdBy: user.userId,
      updatedBy: user.userId,
      orgId: targetOrgId,
    })

    const savedTask = await this.taskRepository.save(task)

    await this.createAuditLog(user, 'CREATE', 'Task', savedTask.id, {
      title: savedTask.title,
      category: savedTask.category,
      status: savedTask.status,
    })

    return this.mapToResponseDto(savedTask)
  }

  async update(
    user: RequestUser,
    id: number,
    updateTaskDto: UpdateTaskDto
  ): Promise<TaskResponseDto> {
    const task = await this.taskRepository.findOne({ where: { id } })

    if (!task) {
      throw new NotFoundException('Task not found')
    }

    if (!canModifyResource(user, task.orgId, task.createdBy)) {
      throw new ForbiddenException('Access denied')
    }

    // Map DTO fields to entity fields
    if (updateTaskDto.title !== undefined) task.title = updateTaskDto.title
    if (updateTaskDto.description !== undefined)
      task.description = updateTaskDto.description
    if (updateTaskDto.status !== undefined) task.status = updateTaskDto.status
    if (updateTaskDto.category !== undefined)
      task.category = updateTaskDto.category
    if (updateTaskDto.order !== undefined) task.orderIndex = updateTaskDto.order

    task.updatedBy = user.userId
    const updatedTask = await this.taskRepository.save(task)

    await this.createAuditLog(user, 'UPDATE', 'Task', updatedTask.id, {
      changes: updateTaskDto,
    })

    return this.mapToResponseDto(updatedTask)
  }

  async remove(user: RequestUser, id: number): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id } })

    if (!task) {
      throw new NotFoundException('Task not found')
    }

    if (!canModifyResource(user, task.orgId, task.createdBy)) {
      throw new ForbiddenException('Access denied')
    }

    await this.taskRepository.remove(task)

    await this.createAuditLog(user, 'DELETE', 'Task', id, {
      title: task.title,
    })
  }

  private async createAuditLog(
    user: RequestUser,
    action: string,
    entityType: string,
    entityId: number,
    metadata: any
  ): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      ts: new Date(),
      userId: user.userId,
      action,
      resource: entityType,
      resourceId: entityId,
      allowed: true,
      meta: metadata,
    })

    await this.auditLogRepository.save(auditLog)
  }

  private mapToResponseDto(task: Task): TaskResponseDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      category: task.category,
      dueDate: task.dueDate,
      order: task.orderIndex,
      createdById: task.createdBy,
      organizationId: task.orgId,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }
  }
}
