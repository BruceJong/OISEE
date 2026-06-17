import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserInfo {
  id: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserInfo => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  }
);
