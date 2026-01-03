import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common'
import { TasksService } from './tasks.service'
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskResponseDto,
  Permission,
} from '@secure-task-management/data'
import {
  JwtAuthGuard,
  RequirePermissions,
  PermissionsGuard,
  CurrentUser,
} from '@secure-task-management/auth'
import { RequestUser } from '@secure-task-management/data'

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequirePermissions(Permission.TASK_VIEW)
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: 'ASC' | 'DESC'
  ): Promise<TaskResponseDto[]> {
    return this.tasksService.findAll(user, {
      status,
      category,
      search,
      sortBy,
      sortDir,
    })
  }

  @Get(':id')
  @RequirePermissions(Permission.TASK_VIEW)
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number
  ): Promise<TaskResponseDto> {
    return this.tasksService.findOne(user, id)
  }

  @Post()
  @RequirePermissions(Permission.TASK_CREATE)
  async create(
    @CurrentUser() user: RequestUser,
    @Body() createTaskDto: CreateTaskDto
  ): Promise<TaskResponseDto> {
    return this.tasksService.create(user, createTaskDto)
  }

  @Put(':id')
  @RequirePermissions(Permission.TASK_UPDATE)
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(user, id, updateTaskDto)
  }

  @Delete(':id')
  @RequirePermissions(Permission.TASK_DELETE)
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number
  ): Promise<void> {
    return this.tasksService.remove(user, id)
  }
}
