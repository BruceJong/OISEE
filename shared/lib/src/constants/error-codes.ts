/**
 * 错误码规范：
 * - 0:              成功
 * - 10000-19999:    通用（参数、限流、未授权）
 * - 20000-29999:    业务错误
 * - 30000-39999:    内容业务错误
 * - 40000-49999:    认证业务错误
 * - 90000-99999:    服务端错误
 */
export const ERROR_CODES = {
  OK: 0,

  // 通用
  INVALID_PARAMS: 10001,
  UNAUTHORIZED: 10002,
  FORBIDDEN: 10003,
  NOT_FOUND: 10004,
  RATE_LIMITED: 10005,

  // 内容
  CONTENT_DUPLICATE_SLUG: 30001,
  CONTENT_NOT_PUBLISHED: 30002,

  // 认证
  AUTH_INVALID_CREDENTIALS: 40001,
  AUTH_ACCOUNT_DISABLED: 40002,
  AUTH_TOKEN_EXPIRED: 40003,

  // 服务端
  INTERNAL_ERROR: 99999,
} as const;
