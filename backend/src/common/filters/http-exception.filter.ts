import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ERROR_CODES } from '@oisee/shared';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      // 业务异常约定：抛 BusinessException 时 body 形如 { code, message, details? }
      if (typeof body === 'object' && body !== null && 'code' in body) {
        return response.status(HttpStatus.OK).json(body);
      }

      // 普通 HTTP 异常（如 401/403/404）
      const message = typeof body === 'string' ? body : (body as any)?.message ?? exception.message;
      return response.status(status).json({
        code: status === 401 ? ERROR_CODES.UNAUTHORIZED : ERROR_CODES.INVALID_PARAMS,
        message: Array.isArray(message) ? message.join('; ') : message,
        data: null,
      });
    }

    // 未知异常
    this.logger.error('Unhandled exception', exception);
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'Internal server error',
      data: null,
    });
  }
}
