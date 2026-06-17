import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import {
  ERROR_CODES,
  GRADE_STAGES,
  type GradeStage,
  type UserRegisterInput,
} from '@oisee/shared';
import {
  callThinkingModelChat,
  DEFAULT_THINKING_MODEL,
  type ThinkingModelConfig,
} from '../admin/llm-analyzer';

export interface AdminJwtPayload {
  sub: string;
  username: string;
  role: string;
  typ: 'access' | 'refresh';
}

export interface UserJwtPayload {
  sub: string;
  typ: 'access' | 'refresh';
}

/** 对外暴露的用户字段（剔除密码哈希） */
export type PublicUser = Pick<
  User,
  'id' | 'username' | 'nickname' | 'avatar' | 'phone' | 'age' | 'learningStage' | 'gradeStage'
>;

function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    username: u.username,
    nickname: u.nickname,
    avatar: u.avatar,
    phone: u.phone,
    age: u.age,
    learningStage: u.learningStage,
    gradeStage: u.gradeStage,
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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

  // ============================================================
  // 终端用户（前台账号）
  // ============================================================

  /** 账密 / 微信 注册（不自动登录，前端注册成功后跳登录页） */
  async userRegister(data: UserRegisterInput): Promise<PublicUser> {
    if (data.username) {
      const exists = await this.prisma.user.findUnique({ where: { username: data.username } });
      if (exists) {
        throw new BusinessException(ERROR_CODES.AUTH_USERNAME_TAKEN, '该用户名已被注册');
      }
    }
    if (data.wechatOpenId) {
      const exists = await this.prisma.user.findUnique({ where: { wechatOpenId: data.wechatOpenId } });
      if (exists) {
        throw new BusinessException(ERROR_CODES.AUTH_USERNAME_TAKEN, '该微信已注册，请直接扫码登录');
      }
    }

    const passwordHash = data.password ? await argon2.hash(data.password) : null;
    // 优先用第二步已定位好的 gradeStage；否则填了年龄就用思考模型现场定位
    let gradeStage: GradeStage | null = data.gradeStage ?? null;
    if (!gradeStage && typeof data.age === 'number') {
      gradeStage = await this.classifyGrade(data.age, data.learningStage);
    }

    const user = await this.prisma.user.create({
      data: {
        username: data.username ?? null,
        passwordHash,
        nickname: data.nickname,
        avatar: data.avatar,
        phone: data.phone ?? null,
        wechatOpenId: data.wechatOpenId ?? null,
        age: data.age ?? null,
        learningStage: data.learningStage ?? null,
        gradeStage,
      },
    });
    return toPublicUser(user);
  }

  /** 账密登录 */
  async userLogin(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive || !user.passwordHash) {
      throw new BusinessException(ERROR_CODES.AUTH_INVALID_CREDENTIALS, '账号或密码错误');
    }
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      throw new BusinessException(ERROR_CODES.AUTH_INVALID_CREDENTIALS, '账号或密码错误');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueUserTokens(user);
  }

  /**
   * 微信「模拟扫码」：返回一份假资料。
   * 登录页用它直接 find-or-create 登录；注册页用它预填基础信息。
   */
  wechatMockProfile() {
    const seed = Math.random().toString(36).slice(2, 8);
    return {
      openId: `wx_mock_${seed}`,
      nickname: `微信用户_${seed}`,
      avatar: 'panda',
      phone: `13${Math.floor(100000000 + Math.random() * 899999999)}`,
    };
  }

  /** 微信（模拟）扫码登录：按 openId find-or-create */
  async wechatLogin(profile: { openId: string; nickname?: string; avatar?: string; phone?: string }) {
    let user = await this.prisma.user.findUnique({ where: { wechatOpenId: profile.openId } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          wechatOpenId: profile.openId,
          nickname: profile.nickname ?? '微信用户',
          avatar: profile.avatar ?? 'panda',
          phone: profile.phone ?? null,
        },
      });
    } else {
      await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    }
    if (!user.isActive) {
      throw new BusinessException(ERROR_CODES.AUTH_ACCOUNT_DISABLED, '账号不可用');
    }
    return this.issueUserTokens(user);
  }

  async getUserById(id: string): Promise<PublicUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? toPublicUser(user) : null;
  }

  private issueUserTokens(user: User) {
    const secret = process.env.OISEE_JWT_USER_SECRET ?? 'oisee_dev_user_secret_fallback';
    const accessTtl = process.env.OISEE_JWT_ACCESS_TTL ?? '1d';
    const refreshTtl = process.env.OISEE_JWT_REFRESH_TTL ?? '30d';

    const access = this.jwt.sign(
      { sub: user.id, typ: 'access' } satisfies UserJwtPayload,
      { secret, expiresIn: accessTtl, issuer: 'oisee-user' }
    );
    const refresh = this.jwt.sign(
      { sub: user.id, typ: 'refresh' } satisfies UserJwtPayload,
      { secret, expiresIn: refreshTtl, issuer: 'oisee-user' }
    );

    return { accessToken: access, refreshToken: refresh, user: toPublicUser(user) };
  }

  // ── 年级阶段定位（思考模型 + 年龄兜底） ──────────────────

  /** 按年龄兜底（思考模型不可用时） */
  private fallbackGradeByAge(age: number): GradeStage {
    if (age < 6) return 'PRESCHOOL';
    if (age <= 11) return 'PRIMARY';
    if (age <= 14) return 'MIDDLE';
    if (age <= 18) return 'HIGH';
    return 'ADULT';
  }

  /** 读思考模型配置（adminSetting['ai_thinking_model']，缺省内置 DeepSeek） */
  private async getThinkingModel(): Promise<ThinkingModelConfig> {
    const rec = await this.prisma.adminSetting.findUnique({ where: { key: 'ai_thinking_model' } });
    const cfg = (rec?.value as Partial<ThinkingModelConfig> | null) ?? null;
    const merged = { ...DEFAULT_THINKING_MODEL, ...(cfg ?? {}) };
    return merged;
  }

  /**
   * 根据年龄 + 学习阶段定位年级阶段，调用思考模型；
   * 模型不可用 / 返回异常时回退到按年龄判定，保证注册流程不被外部 API 阻塞。
   */
  async classifyGrade(age: number, learningStage?: string): Promise<GradeStage> {
    const systemPrompt = `你是少儿教育分龄助手。根据学员的年龄和（可选）学习阶段描述，判定其所处年级阶段。
只能返回以下五个英文枚举之一，不要任何多余文字、标点或解释：
PRESCHOOL（幼儿阶段，约 3-5 岁 / 学龄前）
PRIMARY（小学阶段，约 6-11 岁）
MIDDLE（初中阶段，约 12-14 岁）
HIGH（高中阶段，约 15-18 岁）
ADULT（成人阶段，约 18 岁以上）`;
    const userInput = `年龄：${age} 岁；学习阶段：${learningStage?.trim() || '未填写'}`;

    try {
      const cfg = await this.getThinkingModel();
      if (!cfg.endpoint || !cfg.apiKey || !cfg.model) {
        return this.fallbackGradeByAge(age);
      }
      const raw = await callThinkingModelChat(systemPrompt, userInput, cfg, { temperature: 0 });
      const upper = (raw ?? '').toUpperCase();
      const hit = GRADE_STAGES.find((s) => upper.includes(s));
      return hit ?? this.fallbackGradeByAge(age);
    } catch (e: any) {
      this.logger.warn(`年级阶段思考模型调用失败，按年龄兜底：${e?.message ?? e}`);
      return this.fallbackGradeByAge(age);
    }
  }
}
