import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import {
  LoginDto,
  RegisterDto,
  RequestUser,
  Permission,
} from '@secure-task-management/data'
import {
  JwtAuthGuard,
  CurrentUser,
  PermissionsGuard,
  RequirePermissions,
} from '@secure-task-management/auth'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<{ accessToken: string }> {
    return this.authService.login(loginDto)
  }

  @Post('register')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(
    Permission.TASK_CREATE,
    Permission.TASK_DELETE,
    Permission.AUDIT_VIEW
  )
  async register(
    @Body() registerDto: RegisterDto
  ): Promise<{ accessToken: string }> {
    return this.authService.register(registerDto)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: RequestUser) {
    return {
      id: user.userId,
      email: user.email,
      orgId: user.organizationId,
      role: user.role,
    }
  }
}
