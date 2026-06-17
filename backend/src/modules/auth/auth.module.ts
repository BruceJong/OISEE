import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { UserAuthController } from './user-auth.controller';
import { JwtAdminStrategy } from './strategies/jwt-admin.strategy';
import { JwtUserStrategy } from './strategies/jwt-user.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      // 模块内部按 token 类型分别签发，secret 走环境变量
      signOptions: { issuer: 'oisee-admin' },
    }),
  ],
  controllers: [AdminAuthController, UserAuthController],
  providers: [AuthService, JwtAdminStrategy, JwtUserStrategy],
  exports: [AuthService],
})
export class AuthModule {}
