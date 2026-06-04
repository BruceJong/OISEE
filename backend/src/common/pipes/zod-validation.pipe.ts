import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';
import { BusinessException } from '../exceptions/business.exception';
import { ERROR_CODES } from '@oisee/shared';

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private schema: ZodSchema<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    try {
      return this.schema.parse(value);
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new BusinessException(ERROR_CODES.INVALID_PARAMS, message, err.errors);
      }
      throw err;
    }
  }
}
