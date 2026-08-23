import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload =
        typeof body === 'string'
          ? { code: 'INTERNAL_ERROR', message: body }
          : (body as Record<string, unknown>);

      const code =
        (payload.code as string) ??
        (status === 401
          ? 'UNAUTHORIZED'
          : status === 403
            ? 'FORBIDDEN'
            : status === 404
              ? 'NOT_FOUND'
              : status === 429
                ? 'RATE_LIMITED'
                : status === 423
                  ? 'ACCOUNT_LOCKED'
                  : status === 400
                    ? 'VALIDATION_ERROR'
                    : 'INTERNAL_ERROR');

      return response.status(status).json({
        error: {
          code,
          message: (payload.message as string) ?? exception.message,
          details: payload.details,
          attemptsLeft: payload.attemptsLeft,
          lockedUntil: payload.lockedUntil,
          lockDurationMinutes: payload.lockDurationMinutes,
          maxLoginAttempts: payload.maxLoginAttempts,
        },
      });
    }

    console.error(exception);
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
}
