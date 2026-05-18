import { PipeTransform, Injectable, HttpStatus } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const fieldErrors = this.formatErrors(result.error);
      throw new HttpException(
        {
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          error: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fields: fieldErrors,
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return result.data;
  }

  private formatErrors(error: ZodError): Record<string, string[]> {
    const fields: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.') || '_root';
      if (!fields[path]) {
        fields[path] = [];
      }
      fields[path].push(issue.message);
    }
    return fields;
  }
}
