import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import {
  ConversionOpsError,
  TenantLeakageError,
  IdempotencyConflictError,
  TCPAViolationError,
  AIQuotaExceededError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
} from '@conversionops/sdk-standards';
import { logger } from '@conversionops/observability';

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = `req_${randomUUID().replace(/-/g, '').slice(0, 12)}`;

    let statusCode: number;
    let error: string;
    let message: string;

    if (exception instanceof TenantLeakageError) {
      statusCode = HttpStatus.NOT_FOUND;
      error = 'NOT_FOUND';
      message = 'Resource not found';
      logger.error(
        { requestId, path: request.path, code: exception.code },
        'Tenant leakage attempt detected',
      );
    } else if (exception instanceof IdempotencyConflictError) {
      statusCode = HttpStatus.ACCEPTED;
      error = 'ACCEPTED';
      message = 'Request already processing';
    } else if (exception instanceof TCPAViolationError) {
      statusCode = HttpStatus.FORBIDDEN;
      error = 'TCPA_VIOLATION';
      message = exception.message;
      logger.warn({ requestId, code: exception.code }, 'TCPA violation blocked message');
    } else if (exception instanceof AIQuotaExceededError) {
      statusCode = HttpStatus.TOO_MANY_REQUESTS;
      error = 'AI_QUOTA_EXCEEDED';
      message = exception.message;
    } else if (exception instanceof UnauthorizedError) {
      statusCode = HttpStatus.UNAUTHORIZED;
      error = 'UNAUTHORIZED';
      message = exception.message;
    } else if (exception instanceof ForbiddenError) {
      statusCode = HttpStatus.FORBIDDEN;
      error = 'FORBIDDEN';
      message = exception.message;
    } else if (exception instanceof ValidationError) {
      statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
      error = 'VALIDATION_ERROR';
      message = exception.message;
    } else if (exception instanceof ConversionOpsError) {
      statusCode = HttpStatus.BAD_REQUEST;
      error = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const r = exceptionResponse as Record<string, unknown>;
        error = String(r['error'] ?? 'ERROR');
        message = String(r['message'] ?? exception.message);
      } else {
        error = 'ERROR';
        message = String(exceptionResponse);
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      error = 'INTERNAL_ERROR';
      message = 'An unexpected error occurred';
      logger.error({ requestId, err: exception, path: request.path }, 'Unhandled exception');
    }

    response.status(statusCode).json({
      statusCode,
      error,
      message,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
