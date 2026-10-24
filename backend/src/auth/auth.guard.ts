import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { userForSession, type UserRow } from '../db/repo';

export type AuthedRequest = Request & { user: UserRow; token: string };

// Reads "Authorization: Bearer <token>", finds the live session and attaches the user.
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>() as AuthedRequest;
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const user = token ? await userForSession(token) : undefined;
    if (!user) throw new UnauthorizedException('Sign in to continue');
    req.user = user;
    req.token = token;
    return true;
  }
}

// Public shape of a user. Never includes the password hash.
export function toPublicUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    rollNo: u.roll_no,
    college: u.college,
    branch: u.branch,
    semester: u.semester,
    role: u.role,
    createdAt: u.created_at,
  };
}
