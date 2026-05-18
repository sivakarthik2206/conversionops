import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  TenantLeakageError,
  IdempotencyConflictError,
  ConversionOpsError,
} from '@conversionops/sdk-standards';
import { logger } from '@conversionops/observability';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = uuidv4();

    let statusCode: number;
    let error: string;
    let message: string;

    if (exception instanceof TenantLeakageError) {
      statusCode = HttpStatus.NOT_FOUND;
      error = 'NOT_FOUND';
      message = 'Resource not found';
      logger.error({ requestId, err: exception, url: request.url }, 'Tenant leakage attempt blocked');
    } else if (exception instanceof IdempotencyConflictError) {
      statusCode = HttpStatus.ACCEPTED;
      error = 'ACCEPTED';
      message = exception.message;
    } else if (exception instanceof ConversionOpsError) {
      statusCode = this.mapErrorCodeToStatus(exception.code);
      error = this.mapStatusToErrorString(statusCode);
      message = exception.message;
      logger.warn({ requestId, code: exception.code, url: request.url }, exception.message);
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = typeof resp['message'] === 'string'
          ? resp['message']
          : Array.isArray(resp['message'])
            ? (resp['message'] as string[]).join(', ')
            : exception.message;
      } else {
        message = exception.message;
      }
      error = this.mapStatusToErrorString(statusCode);
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      error = 'INTERNAL_SERVER_ERROR';
      message = 'An unexpected error occurred';
      logger.error({ requestId, err: exception, url: request.url }, 'Unhandled exception');
    }

    response.status(statusCode).json({
      statusCode,
      error,
      message,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  private mapErrorCodeToStatus(code: string): number {
    const map: Record<string, number> = {
      WORKSPACE_NOT_FOUND: HttpStatus.NOT_FOUND,
      LEAD_NOT_FOUND: HttpStatus.NOT_FOUND,
      TENANT_LEAKAGE: HttpStatus.NOT_FOUND,
      UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
      FORBIDDEN: HttpStatus.FORBIDDEN,
      VALIDATION_ERROR: HttpStatus.UNPROCESSABLE_ENTITY,
      AI_QUOTA_EXCEEDED: HttpStatus.TOO_MANY_REQUESTS,
      TCPA_VIOLATION: HttpStatus.FORBIDDEN,
      IDEMPOTENCY_CONFLICT: HttpStatus.ACCEPTED,
      EXTERNAL_SERVICE_ERROR: HttpStatus.BAD_GATEWAY,
    };
    return map[code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private mapStatusToErrorString(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      202: 'ACCEPTED',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
    };
    return map[status] ?? 'INTERNAL_SERVER_ERROR';
  }
}
