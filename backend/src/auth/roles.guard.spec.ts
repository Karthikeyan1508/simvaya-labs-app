import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

// @nestjs/common 12 is ESM only and this Jest setup runs CommonJS, so Nest is stubbed here.
// The guard logic itself is real.
jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  SetMetadata: () => () => undefined,
  ForbiddenException: class ForbiddenException extends Error {},
}));
jest.mock('@nestjs/core', () => ({ Reflector: class Reflector {} }));

// Fake request context. The guard only reads the handler, the class and req.user.
function context(user: unknown, roles: string[] | undefined) {
  class Controller {}
  const handler = () => undefined;
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(roles) } as unknown as Reflector;
  const req = { user };
  const ctx = {
    getHandler: () => handler,
    getClass: () => Controller,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { guard: new RolesGuard(reflector), ctx };
}

describe('roles guard', () => {
  it('lets any user through a route without @Roles', () => {
    const { guard, ctx } = context({ role: 'student' }, undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('lets a teacher through a teacher route', () => {
    const { guard, ctx } = context({ role: 'teacher' }, ['teacher']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('refuses a student on a teacher route with 403 Teachers only', () => {
    const { guard, ctx } = context({ role: 'student' }, ['teacher']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow('Teachers only');
  });

  it('refuses when there is no user on the request', () => {
    const { guard, ctx } = context(undefined, ['teacher']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
