import { TestBed } from '@angular/core/testing'
import { of, Observable } from 'rxjs'
import { TasksStoreService } from './tasks-store.service'
import { TasksService } from './tasks.service'
import {
  TaskResponseDto,
  TaskStatus,
  TaskCategory,
} from '@secure-task-management/data'

describe('TasksStoreService', () => {
  let service: TasksStoreService
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
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.URGENT,
      order: 1,
      createdById: 1,
      organizationId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(() => {
    const tasksServiceSpy = {
      getTasks: jest.fn(),
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
    }

    TestBed.configureTestingModule({
      providers: [
        TasksStoreService,
        { provide: TasksService, useValue: tasksServiceSpy },
      ],
    })

    service = TestBed.inject(TasksStoreService)
    tasksService = TestBed.inject(TasksService) as any
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })

  describe('loadTasks', () => {
    it('should load tasks and update tasks$ observable', (done) => {
      tasksService.getTasks.mockReturnValue(of(mockTasks))

      service.tasks$.subscribe((tasks) => {
        if (tasks.length > 0) {
          expect(tasks).toEqual(mockTasks)
          expect(tasks.length).toBe(2)
          expect(tasks[0].title).toBe('Task 1')
          expect(tasks[1].title).toBe('Task 2')
          done()
        }
      })

      service.loadTasks()
    })

    it('should set loading to true while loading', (done) => {
      tasksService.getTasks.mockReturnValue(of(mockTasks))

      let loadingStates: boolean[] = []
      service.loading$.subscribe((loading) => {
        loadingStates.push(loading)
        if (loadingStates.length === 3) {
          expect(loadingStates[0]).toBe(false) // Initial state
          expect(loadingStates[1]).toBe(true) // Loading starts
          expect(loadingStates[2]).toBe(false) // Loading ends
          done()
        }
      })

      service.loadTasks()
    })

    it('should load tasks with filters', (done) => {
      const filters = { status: 'TODO', category: 'WORK' }
      tasksService.getTasks.mockReturnValue(of([mockTasks[0]]))

      service.tasks$.subscribe((tasks) => {
        if (tasks.length > 0) {
          expect(tasksService.getTasks).toHaveBeenCalledWith(filters)
          done()
        }
      })

      service.loadTasks(filters)
    })

    it('should handle errors when loading tasks', (done) => {
      const error = new Error('Failed to load tasks')
      const errorObservable = new Observable<TaskResponseDto[]>(
        (subscriber) => {
          subscriber.error(error)
        }
      )
      tasksService.getTasks.mockReturnValue(errorObservable)

      service.error$.subscribe((err) => {
        if (err) {
          expect(err).toBe('Failed to load tasks')
          done()
        }
      })

      service.loadTasks()
    })
  })

  describe('createTask', () => {
    it('should create a task and add it to the store', (done) => {
      const newTask: TaskResponseDto = {
        id: 3,
        title: 'New Task',
        description: 'New Description',
        status: TaskStatus.TODO,
        category: TaskCategory.PERSONAL,
        order: 2,
        createdById: 1,
        organizationId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      tasksService.createTask.mockReturnValue(of(newTask))

      service
        .createTask({ title: 'New Task', status: TaskStatus.TODO })
        .subscribe(() => {
          setTimeout(() => {
            const tasks = service.getTasks()
            const found = tasks.find((t) => t.id === 3)
            expect(found).toBeDefined()
            expect(found?.title).toBe('New Task')
            done()
          }, 50)
        })
    })
  })

  describe('updateTask', () => {
    it('should update a task in the store', (done) => {
      tasksService.getTasks.mockReturnValue(of(mockTasks))
      service.loadTasks()

      setTimeout(() => {
        const updatedTask = { ...mockTasks[0], title: 'Updated Task' }
        tasksService.updateTask.mockReturnValue(of(updatedTask))

        service.updateTask(1, { title: 'Updated Task' }).subscribe(() => {
          setTimeout(() => {
            const tasks = service.getTasks()
            const found = tasks.find((t) => t.id === 1)
            expect(found?.title).toBe('Updated Task')
            done()
          }, 50)
        })
      }, 100)
    })
  })

  describe('deleteTask', () => {
    it('should delete a task from the store', (done) => {
      tasksService.getTasks.mockReturnValue(of(mockTasks))
      service.loadTasks()

      setTimeout(() => {
        tasksService.deleteTask.mockReturnValue(of(void 0))

        service.deleteTask(1).subscribe(() => {
          setTimeout(() => {
            const tasks = service.getTasks()
            const found = tasks.find((t) => t.id === 1)
            expect(found).toBeUndefined()
            expect(tasks.length).toBe(1)
            done()
          }, 50)
        })
      }, 100)
    })
  })

  describe('setFilters', () => {
    it('should update filters and reload tasks', (done) => {
      const filters = { status: 'DONE', category: 'WORK' }
      tasksService.getTasks.mockReturnValue(of([]))

      let callCount = 0
      service.filters$.subscribe((f) => {
        callCount++
        if (callCount > 1 && f.status === 'DONE') {
          expect(f).toEqual(filters)
          setTimeout(() => {
            expect(tasksService.getTasks).toHaveBeenCalledWith(filters)
            done()
          }, 100)
        }
      })

      service.setFilters(filters)
    })
  })

  describe('reorderTasks', () => {
    it('should update task order locally and persist to backend', () => {
      const reorderedTasks = [mockTasks[1], mockTasks[0]]
      tasksService.updateTask.mockReturnValue(of(mockTasks[0]))

      service.reorderTasks(reorderedTasks)

      service.tasks$.subscribe((tasks) => {
        expect(tasks[0].id).toBe(2)
        expect(tasks[1].id).toBe(1)
      })
    })
  })
})
