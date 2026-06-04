import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(code: number, message: string, details?: unknown) {
    super({ code, message, data: null, details }, HttpStatus.OK);
  }
}
