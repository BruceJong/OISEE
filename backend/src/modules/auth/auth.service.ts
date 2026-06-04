import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '@oisee/shared';

export interface AdminJwtPayload {
  sub: string;
  username: string;
  role: string;
  typ: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async adminLogin(username: string, password: string) {
    const admin = await this.prisma.admin.findUnique({ where: { username } });
    if (!admin || !admin.isActive) {
      throw new BusinessException(ERROR_CODES.AUTH_INVALID_CREDENTIALS, '账号或密码错误');
    }

    const ok = await argon2.verify(admin.passwordHash, password);
    if (!ok) {
      throw new BusinessException(ERROR_CODES.AUTH_INVALID_CREDENTIALS, '账号或密码错误');
    }

    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(admin.id, admin.username, admin.role);
  }

  async refreshAdminToken(refreshToken: string) {
    const payload = this.verifyAdminToken(refreshToken);
    if (payload.typ !== 'refresh') {
      throw new BusinessException(ERROR_CODES.AUTH_TOKEN_EXPIRED, '无效的 refresh token');
    }

    const admin = await this.prisma.admin.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.isActive) {
      throw new BusinessException(ERROR_CODES.AUTH_ACCOUNT_DISABLED, '账号不可用');
    }

    return this.issueTokens(admin.id, admin.username, admin.role);
  }

  private issueTokens(adminId: string, username: string, role: string) {
    const secret = process.env.OISEE_JWT_ADMIN_SECRET!;
    const accessTtl = process.env.OISEE_JWT_ACCESS_TTL ?? '15m';
    const refreshTtl = process.env.OISEE_JWT_REFRESH_TTL ?? '30d';

    const access = this.jwt.sign(
      { sub: adminId, username, role, typ: 'access' } satisfies AdminJwtPayload,
      { secret, expiresIn: accessTtl, issuer: 'oisee-admin' }
    );
    const refresh = this.jwt.sign(
      { sub: adminId, username, role, typ: 'refresh' } satisfies AdminJwtPayload,
      { secret, expiresIn: refreshTtl, issuer: 'oisee-admin' }
    );

    return {
      accessToken: access,
      refreshToken: refresh,
      admin: { id: adminId, username, role },
    };
  }

  private verifyAdminToken(token: string): AdminJwtPayload {
    try {
      return this.jwt.verify<AdminJwtPayload>(token, {
        secret: process.env.OISEE_JWT_ADMIN_SECRET,
        issuer: 'oisee-admin',
      });
    } catch {
      throw new BusinessException(ERROR_CODES.AUTH_TOKEN_EXPIRED, 'Token 无效或已过期');
    }
  }
}
