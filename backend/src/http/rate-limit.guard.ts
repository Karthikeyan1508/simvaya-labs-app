import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import type { AuthedRequest } from '../auth/auth.guard';
import { createLimiter, type Rule } from './rate-limit';

const KEY = 'rate-limit';

// Marks a route with its per-user budget. Put RateLimitGuard after AuthGuard so the user is known.
export const RateLimit = (name: string, ...rules: Rule[]) => SetMetadata(KEY, { name, rules });

@Injectable()
export class RateLimitGuard implements CanActivate {
  private limiters = new Map<string, ReturnType<typeof createLimiter>>();

  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const cfg = this.reflector.get<{ name: string; rules: Rule[] } | undefined>(KEY, ctx.getHandler());
    if (!cfg) return true;

    let limiter = this.limiters.get(cfg.name);
    if (!limiter) {
      limiter = createLimiter(cfg.rules);
      this.limiters.set(cfg.name, limiter);
    }
    const http = ctx.switchToHttp();
    const req = http.getRequest<AuthedRequest>();
    const verdict = limiter.take(req.user?.id ?? req.ip ?? 'anonymous');
    if (verdict.ok) return true;

    http.getResponse<Response>().set('Retry-After', String(verdict.retryAfterSec));
    throw new HttpException(
      { statusCode: 429, message: `Too many requests. Try again in ${verdict.retryAfterSec} seconds.`, error: 'Too Many Requests' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
