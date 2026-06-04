import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AdminLoginSchema, RefreshTokenSchema, AdminLoginInput, RefreshTokenInput } from '@oisee/shared';

@Controller('admin-auth')
export class AdminAuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @UsePipes(new ZodValidationPipe(AdminLoginSchema))
  async login(@Body() body: AdminLoginInput) {
    return this.auth.adminLogin(body.username, body.password);
  }

  @Post('refresh')
  @UsePipes(new ZodValidationPipe(RefreshTokenSchema))
  async refresh(@Body() body: RefreshTokenInput) {
    return this.auth.refreshAdminToken(body.refreshToken);
  }
}
