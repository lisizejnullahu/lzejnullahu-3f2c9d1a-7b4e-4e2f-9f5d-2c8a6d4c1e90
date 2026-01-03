import { Test, TestingModule } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { Role } from '@secure-task-management/data'

describe('AuthController', () => {
  let controller: AuthController
  let authService: AuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            register: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<AuthController>(AuthController)
    authService = module.get<AuthService>(AuthService)
  })

  it('should return JWT token on successful login', async () => {
    const loginDto = {
      email: 'test@test.com',
      password: 'password123',
    }

    const expectedResponse = {
      accessToken: 'jwt-token',
      user: {
        id: 1,
        email: 'test@test.com',
        name: 'Test User',
        role: Role.ADMIN,
        organizationId: 1,
        createdAt: new Date(),
      },
    }

    jest.spyOn(authService, 'login').mockResolvedValue(expectedResponse)

    const result = await controller.login(loginDto)

    expect(result).toEqual(expectedResponse)
    expect(authService.login).toHaveBeenCalledWith(loginDto)
  })

  it('should throw UnauthorizedException on invalid credentials', async () => {
    const loginDto = {
      email: 'test@test.com',
      password: 'wrongpassword',
    }

    jest
      .spyOn(authService, 'login')
      .mockRejectedValue(new UnauthorizedException('Invalid credentials'))

    await expect(controller.login(loginDto)).rejects.toThrow(
      UnauthorizedException
    )
  })
})
