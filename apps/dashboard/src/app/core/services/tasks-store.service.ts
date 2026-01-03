import { Injectable } from '@angular/core'
import { BehaviorSubject, Observable } from 'rxjs'
import { tap, finalize } from 'rxjs/operators'
import { TasksService, TaskFilters } from './tasks.service'
import { TaskResponseDto } from '@secure-task-management/data'

@Injectable({
  providedIn: 'root',
})
export class TasksStoreService {
  private tasksSubject = new BehaviorSubject<TaskResponseDto[]>([])
  private loadingSubject = new BehaviorSubject<boolean>(false)
  private errorSubject = new BehaviorSubject<string | null>(null)
  private filtersSubject = new BehaviorSubject<TaskFilters>({})

  public tasks$ = this.tasksSubject.asObservable()
  public loading$ = this.loadingSubject.asObservable()
  public error$ = this.errorSubject.asObservable()
  public filters$ = this.filtersSubject.asObservable()

  constructor(private tasksService: TasksService) {}

  loadTasks(filters?: TaskFilters): void {
    this.loadingSubject.next(true)
    this.errorSubject.next(null)

    if (filters) {
      this.filtersSubject.next(filters)
    }

    this.tasksService
      .getTasks(filters || this.filtersSubject.value)
      .pipe(
        tap((tasks) => {
          this.tasksSubject.next(tasks)
        }),
        finalize(() => this.loadingSubject.next(false))
      )
      .subscribe({
        error: (error) => {
          console.error('Error loading tasks:', error)
          this.errorSubject.next('Failed to load tasks')
        },
      })
  }

  createTask(task: Partial<TaskResponseDto>): Observable<TaskResponseDto> {
    this.loadingSubject.next(true)
    return this.tasksService.createTask(task).pipe(
      tap((newTask) => {
        const currentTasks = this.tasksSubject.value
        this.tasksSubject.next([...currentTasks, newTask])
      }),
      finalize(() => this.loadingSubject.next(false))
    )
  }

  updateTask(
    id: number,
    updates: Partial<TaskResponseDto>
  ): Observable<TaskResponseDto> {
    this.loadingSubject.next(true)
    return this.tasksService.updateTask(id, updates).pipe(
      tap((updatedTask) => {
        const currentTasks = this.tasksSubject.value
        const index = currentTasks.findIndex((t) => t.id === id)
        if (index !== -1) {
          currentTasks[index] = updatedTask
          this.tasksSubject.next([...currentTasks])
        }
      }),
      finalize(() => this.loadingSubject.next(false))
    )
  }

  deleteTask(id: number): Observable<void> {
    this.loadingSubject.next(true)
    return this.tasksService.deleteTask(id).pipe(
      tap(() => {
        const currentTasks = this.tasksSubject.value
        this.tasksSubject.next(currentTasks.filter((t) => t.id !== id))
      }),
      finalize(() => this.loadingSubject.next(false))
    )
  }

  updateTaskOrder(
    taskId: number,
    newOrder: number
  ): Observable<TaskResponseDto> {
    return this.updateTask(taskId, { order: newOrder })
  }

  reorderTasks(tasks: TaskResponseDto[]): void {
    // Update local state immediately for smooth UX
    this.tasksSubject.next(tasks)

    // Persist order changes to backend
    tasks.forEach((task, index) => {
      if (task.order !== index) {
        this.tasksService.updateTask(task.id, { order: index }).subscribe({
          error: (error) => {
            console.error('Error updating task order:', error)
            // Reload tasks on error to sync with backend
            this.loadTasks()
          },
        })
      }
    })
  }

  setFilters(filters: TaskFilters): void {
    this.filtersSubject.next(filters)
    this.loadTasks(filters)
  }

  clearError(): void {
    this.errorSubject.next(null)
  }

  getTasks(): TaskResponseDto[] {
    return this.tasksSubject.value
  }
}
