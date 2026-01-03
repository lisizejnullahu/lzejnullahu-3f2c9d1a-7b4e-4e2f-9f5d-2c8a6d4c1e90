import { Controller, Get } from '@nestjs/common'

@Controller()
export class AppController {
  @Get()
  getInfo() {
    return {
      name: 'Secure Task Management API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        auth: {
          login: 'POST /auth/login',
          register: 'POST /auth/register',
          me: 'GET /auth/me',
        },
        tasks: {
          list: 'GET /tasks',
          create: 'POST /tasks',
          update: 'PUT /tasks/:id',
          delete: 'DELETE /tasks/:id',
        },
        auditLog: {
          list: 'GET /audit-log',
        },
      },
      documentation: 'See README.md for full API documentation',
    }
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }
}
