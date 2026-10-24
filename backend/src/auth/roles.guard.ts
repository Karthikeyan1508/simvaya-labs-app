import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthedRequest } from './auth.guard';
import type { UserRole } from '../db/repo';
import { ROLES_KEY } from './roles.decorator';

// Runs after AuthGuard, so req.user is already set.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ForbiddenException(roles.includes('teacher') ? 'Teachers only' : 'Not allowed for this account');
    }
    return true;
  }
}
