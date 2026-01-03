import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Permission } from '@secure-task-management/data'
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator'
import { hasPermission } from '../helpers/permissions.helper'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    )

    if (!requiredPermissions) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      return false
    }

    return requiredPermissions.some((permission) =>
      hasPermission(user.role, permission)
    )
  }
}
