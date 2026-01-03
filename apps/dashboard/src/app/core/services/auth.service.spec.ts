import { TestBed } from '@angular/core/testing'
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing'
import { AuthService } from './auth.service'
import { Role } from '@secure-task-management/data'

describe('AuthService - JWT Token Storage', () => {
  let service: AuthService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    })
    service = TestBed.inject(AuthService)
    httpMock = TestBed.inject(HttpTestingController)
    localStorage.clear()
  })

  afterEach(() => {
    httpMock.verify()
    localStorage.clear()
  })

  it.skip('should store JWT token in localStorage on successful login', (done) => {
    const mockLoginResponse = {
      accessToken: 'test-jwt-token-123',
    }

    const mockUserProfile = {
      id: 1,
      email: 'test@test.com',
      orgId: 1,
      role: 'ADMIN',
    }

    service.login({ email: 'test@test.com', password: 'password' }).subscribe({
      next: (response) => {
        expect(response.accessToken).toBe('test-jwt-token-123')

        const storedToken = localStorage.getItem('auth_token')
        expect(storedToken).toBe('test-jwt-token-123')

        // Wait for profile to be loaded
        setTimeout(() => {
          const storedUser = localStorage.getItem('current_user')
          expect(storedUser).toBeTruthy()
          const parsedUser = JSON.parse(storedUser!)
          expect(parsedUser.email).toBe('test@test.com')
          done()
        }, 100)
      },
    })

    const loginReq = httpMock.expectOne('http://localhost:3000/auth/login')
    expect(loginReq.request.method).toBe('POST')
    loginReq.flush(mockLoginResponse)

    const profileReq = httpMock.expectOne('http://localhost:3000/auth/me')
    expect(profileReq.request.method).toBe('GET')
    profileReq.flush(mockUserProfile)
  })

  it('should retrieve token from localStorage', () => {
    localStorage.setItem('auth_token', 'stored-token-456')

    const token = service.getToken()

    expect(token).toBe('stored-token-456')
  })

  it('should return true for isAuthenticated when token exists', () => {
    localStorage.setItem('auth_token', 'valid-token')

    expect(service.isAuthenticated()).toBe(true)
  })

  it('should return false for isAuthenticated when no token exists', () => {
    expect(service.isAuthenticated()).toBe(false)
  })

  it('should clear token and user from localStorage on logout', () => {
    localStorage.setItem('auth_token', 'token-to-clear')
    localStorage.setItem(
      'current_user',
      JSON.stringify({ id: 1, email: 'test@test.com' })
    )

    service.logout()

    expect(localStorage.getItem('auth_token')).toBeNull()
    expect(localStorage.getItem('current_user')).toBeNull()
    expect(service.getCurrentUser()).toBeNull()
  })

  it('should restore user from localStorage on service initialization', () => {
    const mockUser = {
      id: 1,
      email: 'test@test.com',
      name: 'Test User',
      role: Role.VIEWER,
      organizationId: 1,
      createdAt: new Date(),
    }
    localStorage.setItem('current_user', JSON.stringify(mockUser))

    const newService = new AuthService(null as any)

    const currentUser = newService.getCurrentUser()
    expect(currentUser).toBeTruthy()
    expect(currentUser?.email).toBe('test@test.com')
  })
})
