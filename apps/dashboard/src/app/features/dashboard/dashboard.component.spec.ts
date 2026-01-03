import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { RouterTestingModule } from '@angular/router/testing'
import { DashboardComponent } from './dashboard.component'
import { AuthService } from '../../core/services/auth.service'
import { TasksService } from '../../core/services/tasks.service'
import { of } from 'rxjs'
import {
  TaskStatus,
  TaskResponseDto,
  TaskCategory,
} from '@secure-task-management/data'
import { CdkDragDrop } from '@angular/cdk/drag-drop'

describe('DashboardComponent - Drag-Drop', () => {
  let component: DashboardComponent
  let fixture: ComponentFixture<DashboardComponent>
  let tasksService: jest.Mocked<TasksService>

  const mockTasks: TaskResponseDto[] = [
    {
      id: 1,
      title: 'Task 1',
      description: 'Description 1',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      order: 0,
      createdById: 1,
      organizationId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      title: 'Task 2',
      description: 'Description 2',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      order: 1,
      createdById: 1,
      organizationId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      title: 'Task 3',
      description: 'Description 3',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.WORK,
      order: 0,
      createdById: 1,
      organizationId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(async () => {
    // Mock window.matchMedia for ThemeService
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })

    const tasksServiceSpy = {
      getTasks: jest.fn().mockReturnValue(of(mockTasks)),
      updateTask: jest.fn().mockReturnValue(
        of({
          ...mockTasks[0],
          order: 1,
          status: TaskStatus.TODO,
        })
      ),
    }

    await TestBed.configureTestingModule({
      imports: [
        DashboardComponent,
        HttpClientTestingModule,
        RouterTestingModule,
      ],
      providers: [
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: () => ({ id: 1, role: 'ADMIN' }),
            currentUser$: of({ id: 1, role: 'ADMIN' }),
          },
        },
        { provide: TasksService, useValue: tasksServiceSpy },
      ],
    }).compileComponents()

    tasksService = TestBed.inject(TasksService) as any

    fixture = TestBed.createComponent(DashboardComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should organize tasks by status on load', () => {
    expect(component.todoTasks.length).toBe(2)
    expect(component.inProgressTasks.length).toBe(1)
    expect(component.doneTasks.length).toBe(0)
  })

  it('should reorder tasks within the same column', () => {
    // Arrange
    component.todoTasks = [...mockTasks.slice(0, 2)]
    const event = {
      previousContainer: { data: component.todoTasks },
      container: { data: component.todoTasks },
      previousIndex: 0,
      currentIndex: 1,
    } as CdkDragDrop<TaskResponseDto[]>

    // Act
    component.drop(event, TaskStatus.TODO)

    // Assert
    expect(component.todoTasks[0].id).toBe(2) // Task 2 moved to first position
    expect(component.todoTasks[1].id).toBe(1) // Task 1 moved to second position
    expect(tasksService.updateTask).toHaveBeenCalled()
  })

  it('should transfer task to different column and update status', () => {
    // Arrange
    component.todoTasks = [mockTasks[0]]
    component.inProgressTasks = [mockTasks[2]]
    const event = {
      previousContainer: { data: component.todoTasks },
      container: { data: component.inProgressTasks },
      previousIndex: 0,
      currentIndex: 0,
    } as CdkDragDrop<TaskResponseDto[]>

    // Act
    component.drop(event, TaskStatus.IN_PROGRESS)

    // Assert
    expect(component.todoTasks.length).toBe(0)
    expect(component.inProgressTasks.length).toBe(2)
    expect(component.inProgressTasks[0].id).toBe(1) // Task 1 moved to IN_PROGRESS
    expect(tasksService.updateTask).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        order: expect.any(Number),
        status: TaskStatus.IN_PROGRESS,
      })
    )
  })

  it('should update orderIndex when dragging within column', () => {
    // Arrange
    component.todoTasks = [...mockTasks.slice(0, 2)]
    const event = {
      previousContainer: { data: component.todoTasks },
      container: { data: component.todoTasks },
      previousIndex: 1,
      currentIndex: 0,
    } as CdkDragDrop<TaskResponseDto[]>

    // Act
    component.drop(event, TaskStatus.TODO)

    // Assert
    expect(tasksService.updateTask).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({
        order: expect.any(Number),
        status: TaskStatus.TODO,
      })
    )
  })

  it('should persist both status and orderIndex when moving across columns', () => {
    // Arrange
    component.todoTasks = [mockTasks[0]]
    component.doneTasks = []
    const event = {
      previousContainer: { data: component.todoTasks },
      container: { data: component.doneTasks },
      previousIndex: 0,
      currentIndex: 0,
    } as CdkDragDrop<TaskResponseDto[]>

    // Act
    component.drop(event, TaskStatus.DONE)

    // Assert
    expect(component.doneTasks.length).toBe(1)
    expect(component.doneTasks[0].id).toBe(1)
    expect(tasksService.updateTask).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        order: 0,
        status: TaskStatus.DONE,
      })
    )
  })
})
