import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentAdminInfo {
  id: string;
  username: string;
  role: string;
}

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentAdminInfo => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  }
);
