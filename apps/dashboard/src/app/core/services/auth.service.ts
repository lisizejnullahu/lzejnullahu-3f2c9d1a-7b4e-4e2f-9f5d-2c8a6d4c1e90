import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { BehaviorSubject, Observable, tap } from 'rxjs'
import {
  LoginDto,
  LoginResponseDto,
  UserResponseDto,
} from '@secure-task-management/data'

interface LoginResponse {
  accessToken: string
}

interface UserProfile {
  id: number
  email: string
  orgId: number
  role: string
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000'
  private readonly TOKEN_KEY = 'auth_token'
  private readonly USER_KEY = 'current_user'

  private currentUserSubject = new BehaviorSubject<UserProfile | null>(
    this.getUserFromStorage()
  )
  public currentUser$ = this.currentUserSubject.asObservable()

  constructor(private http: HttpClient) {}

  login(credentials: LoginDto): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap((response) => {
          this.setToken(response.accessToken)
          this.getProfile().subscribe()
        })
      )
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.USER_KEY)
    this.currentUserSubject.next(null)
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY)
  }

  isAuthenticated(): boolean {
    return !!this.getToken()
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUserSubject.value
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token)
  }

  private getUserFromStorage(): UserProfile | null {
    const userJson = localStorage.getItem(this.USER_KEY)
    return userJson ? JSON.parse(userJson) : null
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.API_URL}/auth/me`).pipe(
      tap((user: UserProfile) => {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user))
        this.currentUserSubject.next(user)
      })
    )
  }
}
