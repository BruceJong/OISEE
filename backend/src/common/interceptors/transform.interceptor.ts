import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ERROR_CODES } from '@oisee/shared';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // 已经是包装好的响应（业务异常通过 filter 返回）直接透传
        if (data && typeof data === 'object' && 'code' in data && 'message' in data) {
          return data;
        }
        return { code: ERROR_CODES.OK, message: 'ok', data: data ?? null };
      })
    );
  }
}
