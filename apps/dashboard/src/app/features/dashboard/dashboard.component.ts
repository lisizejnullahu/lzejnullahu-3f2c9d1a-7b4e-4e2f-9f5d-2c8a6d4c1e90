import {
  Component,
  OnInit,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop'
import { AuthService } from '../../core/services/auth.service'
import { TasksService } from '../../core/services/tasks.service'
import { ThemeService } from '../../core/services/theme.service'
import {
  TaskResponseDto,
  TaskStatus,
  TaskCategory,
  Role,
} from '@secure-task-management/data'

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  tasks: TaskResponseDto[] = []
  filteredTasks: TaskResponseDto[] = []
  currentUser: any

  // Kanban board columns
  todoTasks: TaskResponseDto[] = []
  inProgressTasks: TaskResponseDto[] = []
  doneTasks: TaskResponseDto[] = []

  filterStatus = ''
  filterCategory = ''
  sortBy = 'order'

  showTaskModal = false
  editingTask: TaskResponseDto | null = null
  taskForm = {
    title: '',
    description: '',
    status: TaskStatus.TODO,
    category: TaskCategory.WORK,
    dueDate: '',
  }

  TaskStatus = TaskStatus
  TaskCategory = TaskCategory
  Role = Role

  isDarkMode = false
  activeTab: 'TODO' | 'IN_PROGRESS' | 'DONE' = 'TODO'
  showShortcutsHelp = false

  constructor(
    private authService: AuthService,
    private tasksService: TasksService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user
    })
    this.themeService.darkMode$.subscribe((isDark) => {
      this.isDarkMode = isDark
    })
    this.loadTasks()
  }

  toggleTheme(): void {
    this.themeService.toggleTheme()
  }

  setActiveTab(tab: 'TODO' | 'IN_PROGRESS' | 'DONE'): void {
    this.activeTab = tab
  }

  loadTasks(): void {
    this.tasksService
      .getTasks({
        status: this.filterStatus,
        category: this.filterCategory,
        sortBy: 'order',
      })
      .subscribe({
        next: (tasks) => {
          this.tasks = tasks
          this.filteredTasks = tasks
          this.organizeTasksByStatus(tasks)
        },
        error: (err) => {
          // Handle error silently or show user-friendly message
        },
      })
  }

  organizeTasksByStatus(tasks: TaskResponseDto[]): void {
    this.todoTasks = tasks
      .filter((t) => String(t.status) === 'TODO')
      .sort((a, b) => a.order - b.order)
    this.inProgressTasks = tasks
      .filter((t) => String(t.status) === 'IN_PROGRESS')
      .sort((a, b) => a.order - b.order)
    this.doneTasks = tasks
      .filter((t) => String(t.status) === 'DONE')
      .sort((a, b) => a.order - b.order)
  }

  drop(event: CdkDragDrop<TaskResponseDto[]>, newStatus: TaskStatus): void {
    if (event.previousContainer === event.container) {
      // Same column - just reorder
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      )

      // Force change detection
      this.cdr.detectChanges()

      // Persist to backend - updateTaskOrders will handle UI updates
      this.updateTaskOrders(event.container.data, newStatus)
    } else {
      // Different column - transfer and update status
      const previousStatus = this.getStatusFromContainer(
        event.previousContainer.data
      )

      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      )

      // Force change detection to update UI immediately
      this.cdr.detectChanges()

      // Persist to backend - updateTaskOrders will handle UI updates
      this.updateTaskOrders(event.container.data, newStatus)
      this.updateTaskOrders(event.previousContainer.data, previousStatus)
    }
  }

  private getStatusFromContainer(data: TaskResponseDto[]): TaskStatus {
    if (data === this.todoTasks) return TaskStatus.TODO
    if (data === this.inProgressTasks) return TaskStatus.IN_PROGRESS
    return TaskStatus.DONE
  }

  private updateTaskOrders(tasks: TaskResponseDto[], status: TaskStatus): void {
    const statusValue = String(status)
    tasks.forEach((task, index) => {
      const needsUpdate =
        task.order !== index || String(task.status) !== statusValue

      if (needsUpdate) {
        // Update local state immediately
        task.order = index
        task.status = statusValue as any

        // Persist to backend
        this.tasksService
          .updateTask(task.id, { order: index, status })
          .subscribe({
            next: (updatedTask) => {
              // Backend confirmed - update with server response
              task.order = updatedTask.order
              task.status = String(updatedTask.status) as any
            },
            error: (err) => {
              // Reload on error to sync with backend
              this.loadTasks()
            },
          })
      }
    })
  }

  applyFilters(): void {
    this.loadTasks()
  }

  openCreateModal(): void {
    this.editingTask = null
    this.taskForm = {
      title: '',
      description: '',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      dueDate: '',
    }
    this.showTaskModal = true
  }

  openEditModal(task: TaskResponseDto): void {
    this.editingTask = task
    this.taskForm = {
      title: task.title,
      description: task.description || '',
      status: task.status as any,
      category: task.category as any,
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().split('T')[0]
        : '',
    }
    this.showTaskModal = true
  }

  closeModal(): void {
    this.showTaskModal = false
    this.editingTask = null
  }

  saveTask(): void {
    const taskData = {
      ...this.taskForm,
      dueDate: this.taskForm.dueDate
        ? new Date(this.taskForm.dueDate)
        : undefined,
    }

    if (this.editingTask) {
      this.tasksService.updateTask(this.editingTask.id, taskData).subscribe({
        next: () => {
          this.loadTasks()
          this.closeModal()
        },
        error: (err) => {
          // Handle error silently or show user-friendly message
        },
      })
    } else {
      this.tasksService.createTask(taskData as any).subscribe({
        next: () => {
          this.loadTasks()
          this.closeModal()
        },
        error: (err) => {
          // Handle error silently or show user-friendly message
        },
      })
    }
  }

  deleteTask(task: TaskResponseDto): void {
    if (confirm(`Delete task "${task.title}"?`)) {
      this.tasksService.deleteTask(task.id).subscribe({
        next: () => this.loadTasks(),
        error: (err) => {
          // Handle error silently or show user-friendly message
        },
      })
    }
  }

  canModify(): boolean {
    return this.currentUser?.role !== Role.VIEWER
  }

  canViewAuditLog(): boolean {
    return (
      this.currentUser?.role === Role.OWNER ||
      this.currentUser?.role === Role.ADMIN
    )
  }

  logout(): void {
    this.authService.logout()
    this.router.navigate(['/login'])
  }

  getCategoryClass(category: string): string {
    const map: Record<string, string> = {
      WORK: 'badge-work',
      PERSONAL: 'badge-personal',
      URGENT: 'badge-urgent',
      LOW_PRIORITY: 'badge-low',
    }
    return map[category] || ''
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      TODO: 'status-todo',
      IN_PROGRESS: 'status-in-progress',
      DONE: 'status-done',
    }
    return map[status] || ''
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT'
    ) {
      return
    }

    // Cmd/Ctrl + K: Create new task
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault()
      if (this.canModify()) {
        this.openCreateModal()
      }
    }

    // Cmd/Ctrl + R: Reload tasks
    if ((event.metaKey || event.ctrlKey) && event.key === 'r') {
      event.preventDefault()
      this.loadTasks()
    }

    // Cmd/Ctrl + D: Toggle dark mode
    if ((event.metaKey || event.ctrlKey) && event.key === 'd') {
      event.preventDefault()
      this.toggleTheme()
    }

    // Cmd/Ctrl + /: Show keyboard shortcuts help
    if ((event.metaKey || event.ctrlKey) && event.key === '/') {
      event.preventDefault()
      this.showShortcutsHelp = !this.showShortcutsHelp
    }

    // Escape: Close modals
    if (event.key === 'Escape') {
      if (this.showTaskModal) {
        this.closeModal()
      } else if (this.showShortcutsHelp) {
        this.showShortcutsHelp = false
      }
    }

    // 1, 2, 3: Switch between tabs
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      if (event.key === '1') {
        event.preventDefault()
        this.setActiveTab('TODO')
      } else if (event.key === '2') {
        event.preventDefault()
        this.setActiveTab('IN_PROGRESS')
      } else if (event.key === '3') {
        event.preventDefault()
        this.setActiveTab('DONE')
      }
    }
  }

  toggleShortcutsHelp(): void {
    this.showShortcutsHelp = !this.showShortcutsHelp
  }
}
