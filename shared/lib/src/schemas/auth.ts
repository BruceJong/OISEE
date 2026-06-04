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
