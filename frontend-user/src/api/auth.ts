import client from './client';
import type { AuthUser } from '@/utils/auth';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface WechatProfile {
  openId: string;
  nickname: string;
  avatar: string;
  phone: string;
}

export interface RegisterPayload {
  username?: string;
  password?: string;
  nickname: string;
  avatar: string;
  phone?: string;
  wechatOpenId?: string;
  age?: number;
  learningStage?: string;
  gradeStage?: string;
}

export const authApi = {
  register: (data: RegisterPayload): Promise<AuthUser> =>
    client.post('/auth/register', data),

  login: (username: string, password: string): Promise<AuthTokens> =>
    client.post('/auth/login', { username, password }),

  /** 微信「模拟扫码」：返回一份假资料 */
  wechatMockScan: (): Promise<WechatProfile> => client.post('/auth/wechat/mock-scan'),

  /** 微信（模拟）扫码登录：find-or-create */
  wechatLogin: (profile: {
    openId: string;
    nickname?: string;
    avatar?: string;
    phone?: string;
  }): Promise<AuthTokens> => client.post('/auth/wechat/login', profile),

  /** 注册第二步：定位年级阶段 */
  classifyGrade: (age: number, learningStage?: string): Promise<{ gradeStage: string }> =>
    client.post('/auth/classify-grade', { age, learningStage }),

  me: (): Promise<AuthUser> => client.get('/auth/me'),
};
