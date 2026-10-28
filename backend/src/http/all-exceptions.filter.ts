import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { errorLine } from './logging';

// Same responses as Nest's default filter. It only adds a log line for unexpected errors and 5xx.
@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(err: unknown, host: ArgumentsHost) {
    if (!(err instanceof HttpException) || err.getStatus() >= 500) {
      const req = host.switchToHttp().getRequest<{ method: string; originalUrl: string }>();
      console.error(errorLine(req.method, req.originalUrl, err));
    }
    super.catch(err, host);
  }
}
