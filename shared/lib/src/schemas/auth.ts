import { z } from 'zod';

export const AdminLoginSchema = z.object({
  username: z.string().min(2).max(40),
  password: z.string().min(6).max(100),
});
export type AdminLoginInput = z.infer<typeof AdminLoginSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

// ============================================================
// 终端用户（前台）鉴权
// ============================================================

/** 年级阶段（由思考模型根据年龄/学习阶段定位） */
export const GRADE_STAGES = ['PRESCHOOL', 'PRIMARY', 'MIDDLE', 'HIGH', 'ADULT'] as const;
export type GradeStage = (typeof GRADE_STAGES)[number];

/** 年级阶段中文标签（前端展示用） */
export const GRADE_STAGE_LABELS: Record<GradeStage, string> = {
  PRESCHOOL: '幼儿阶段',
  PRIMARY: '小学阶段',
  MIDDLE: '初中阶段',
  HIGH: '高中阶段',
  ADULT: '成人阶段',
};

export const UserLoginSchema = z.object({
  username: z.string().min(2).max(40),
  password: z.string().min(6).max(100),
});
export type UserLoginInput = z.infer<typeof UserLoginSchema>;

/**
 * 用户注册：
 * - 账密注册：username + password 必填
 * - 微信注册：带 wechatOpenId 时 username/password 可省略（用昵称登录走微信）
 */
export const UserRegisterSchema = z
  .object({
    username: z.string().min(2).max(40).optional(),
    password: z.string().min(6).max(100).optional(),
    nickname: z.string().min(1).max(40),
    avatar: z.string().min(1).max(40),
    phone: z.string().max(20).optional(),
    wechatOpenId: z.string().max(80).optional(),
    age: z.number().int().min(1).max(120).optional(),
    learningStage: z.string().max(40).optional(),
    // 第二步已用思考模型定位过则带上，避免注册时重复调用
    gradeStage: z.enum(GRADE_STAGES).optional(),
  })
  .refine((d) => !!d.wechatOpenId || (!!d.username && !!d.password), {
    message: '需要用户名和密码，或通过微信扫码注册',
    path: ['username'],
  });
export type UserRegisterInput = z.infer<typeof UserRegisterSchema>;

/** 注册第二步：根据年龄/学习阶段定位年级阶段 */
export const GradeClassifySchema = z.object({
  age: z.number().int().min(1).max(120),
  learningStage: z.string().max(40).optional(),
});
export type GradeClassifyInput = z.infer<typeof GradeClassifySchema>;

/** 微信（模拟）扫码登录：用扫码返回的资料 find-or-create */
export const WechatMockLoginSchema = z.object({
  openId: z.string().min(1),
  nickname: z.string().max(40).optional(),
  avatar: z.string().max(40).optional(),
  phone: z.string().max(20).optional(),
});
export type WechatMockLoginInput = z.infer<typeof WechatMockLoginSchema>;
