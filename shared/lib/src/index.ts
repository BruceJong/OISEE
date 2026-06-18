// 显式 named re-export。
// 不要改回 `export * from`：tsc 会把它编译成运行时的 __exportStar(for-in)，
// Rollup（前端生产构建）无法静态分析这种动态再导出，会丢失命名导出，导致
// 前端 build 报 "X is not exported by shared/lib/dist/index.js"（dev 不报）。
// 新增导出时，请在此处同步登记。

// ---- constants/difficulty ----
export {
  DIFFICULTY,
  DIFFICULTY_LABEL,
  DIFFICULTY_ORDER,
  AGE_BAND,
  AGE_BAND_LABEL,
  AGE_BAND_TO_DIFFICULTY,
} from './constants/difficulty.js';
export type { Difficulty, AgeBand } from './constants/difficulty.js';

// ---- constants/subject ----
export {
  SUBJECT,
  SUBJECT_LABEL,
  SUBJECT_COLOR,
  LEVEL_COLOR,
  CONTENT_STATUS,
  CONTENT_STATUS_LABEL,
} from './constants/subject.js';
export type { Subject, ContentStatus } from './constants/subject.js';

// ---- constants/error-codes ----
export { ERROR_CODES } from './constants/error-codes.js';

// ---- schemas/auth ----
export {
  AdminLoginSchema,
  RefreshTokenSchema,
  GRADE_STAGES,
  GRADE_STAGE_LABELS,
  UserLoginSchema,
  UserRegisterSchema,
  GradeClassifySchema,
  WechatMockLoginSchema,
} from './schemas/auth.js';
export type {
  AdminLoginInput,
  RefreshTokenInput,
  GradeStage,
  UserLoginInput,
  UserRegisterInput,
  GradeClassifyInput,
  WechatMockLoginInput,
} from './schemas/auth.js';

// ---- schemas/content ----
export {
  SceneCreateSchema,
  SceneUpdateSchema,
  ItemCreateSchema,
  ItemUpdateSchema,
  KnowledgePointCreateSchema,
  KnowledgePointUpdateSchema,
  ExperimentCreateSchema,
  ExperimentUpdateSchema,
  QuizQuestionCreateSchema,
  QuizQuestionUpdateSchema,
  SetKnowledgeRelationsSchema,
  ItemLayoutSchema,
  UpdateItemLayoutsSchema,
} from './schemas/content.js';
export type {
  SceneCreateInput,
  SceneUpdateInput,
  ItemCreateInput,
  ItemUpdateInput,
  KnowledgePointCreateInput,
  KnowledgePointUpdateInput,
  ExperimentCreateInput,
  ExperimentUpdateInput,
  QuizQuestionCreateInput,
  QuizQuestionUpdateInput,
  SetKnowledgeRelationsInput,
} from './schemas/content.js';

// ---- types/api ----
export type { ApiResponse, PageQuery, PageResult } from './types/api.js';
