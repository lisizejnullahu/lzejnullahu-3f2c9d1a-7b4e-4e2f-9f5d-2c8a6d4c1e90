import { Injectable } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import { TaskResponseDto } from '@secure-task-management/data'

export interface TaskFilters {
  status?: string
  category?: string
  search?: string
  sortBy?: string
  sortDir?: 'ASC' | 'DESC'
}

@Injectable({
  providedIn: 'root',
})
export class TasksService {
  private readonly API_URL = 'http://localhost:3000'

  constructor(private http: HttpClient) {}

  getTasks(filters?: TaskFilters): Observable<TaskResponseDto[]> {
    let params = new HttpParams()

    if (filters) {
      if (filters.status) params = params.set('status', filters.status)
      if (filters.category) params = params.set('category', filters.category)
      if (filters.search) params = params.set('search', filters.search)
      if (filters.sortBy) params = params.set('sortBy', filters.sortBy)
      if (filters.sortDir) params = params.set('sortDir', filters.sortDir)
    }

    return this.http.get<TaskResponseDto[]>(`${this.API_URL}/tasks`, { params })
  }

  getTask(id: number): Observable<TaskResponseDto> {
    return this.http.get<TaskResponseDto>(`${this.API_URL}/tasks/${id}`)
  }

  createTask(task: Partial<TaskResponseDto>): Observable<TaskResponseDto> {
    return this.http.post<TaskResponseDto>(`${this.API_URL}/tasks`, task)
  }

  updateTask(
    id: number,
    updates: Partial<TaskResponseDto>
  ): Observable<TaskResponseDto> {
    return this.http.put<TaskResponseDto>(
      `${this.API_URL}/tasks/${id}`,
      updates
    )
  }

  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/tasks/${id}`)
  }
}
