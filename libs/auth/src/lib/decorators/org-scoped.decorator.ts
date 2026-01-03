import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { enforceOrgScope } from '../helpers/org-scope.helper'

/**
 * Parameter decorator that validates a resource's orgId is within the user's accessible orgs.
 *
 * Usage:
 * @Get(':id')
 * findOne(@CurrentUser() user: RequestUser, @OrgScoped('orgId') resource: Task) {
 *   // resource.orgId has been validated against user's accessible orgs
 * }
 *
 * Note: This is a simple implementation. In production, you'd want to:
 * 1. Load the resource from the database
 * 2. Extract the orgId field
 * 3. Validate against user's accessible orgs
 */
export const OrgScoped = createParamDecorator(
  (orgIdField: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    const user = request.user
    const resource = request.body || request.params

    if (resource && resource[orgIdField]) {
      enforceOrgScope(user, resource[orgIdField])
    }

    return resource
  }
)
