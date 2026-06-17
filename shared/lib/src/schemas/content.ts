import { z } from 'zod';

/**
 * 媒体 URL 校验：允许完整 URL（http/https）或本地上传的相对路径（/uploads/...）
 * MVP 阶段本地存储以 /uploads/xxx 形式返回，生产环境会切到 OSS 完整 URL
 */
const mediaUrl = () =>
  z
    .string()
    .max(2048)
    .refine(
      (v) => /^https?:\/\//.test(v) || v.startsWith('/uploads/') || v.startsWith('/'),
      { message: '需为完整 URL 或以 / 开头的相对路径' }
    );

// ---- 场景 ----
export const SceneCreateSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, '只允许小写字母、数字、短横线'),
  name: z.string().min(1).max(40),
  groupName: z.string().min(1).max(20),
  description: z.string().max(500).optional().nullable(),
  coverUrl: mediaUrl().optional().nullable(),
  sceneImageUrl: mediaUrl().optional().nullable(),
  sceneImagePrompt: z.string().max(2000).optional().nullable(),
  sceneGroupId: z.string().optional().nullable(),
  iconKind: z.enum(['home', 'school', 'park', 'hospital', 'mall']).optional().nullable(),
  themeColor: z.enum(['sun', 'ocean', 'leaf', 'coral', 'berry']).optional().nullable(),
  isDefault: z.boolean().optional().default(false),
  unlockHint: z.string().max(500).optional().nullable(),
  isLocked: z.boolean().optional().default(false),
  unlockConditions: z
    .object({
      type: z.literal('after_groups'),
      groupIds: z.array(z.string()),
    })
    .optional()
    .nullable(),
  mapPosition: z
    .object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) })
    .optional()
    .nullable(),
  sortOrder: z.number().int().optional().default(0),
});
export type SceneCreateInput = z.infer<typeof SceneCreateSchema>;

export const SceneUpdateSchema = SceneCreateSchema.partial();
export type SceneUpdateInput = z.infer<typeof SceneUpdateSchema>;

// ---- 物品 ----
export const ItemCreateSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(40),
  sceneId: z.string().min(1),
  coverUrl: mediaUrl().optional().nullable(),
  itemImageUrl: mediaUrl().optional().nullable(),
  iconUrl: mediaUrl().optional().nullable(),
  svgSymbolId: z.string().max(40).optional().nullable(),
  shortDesc: z.string().min(1).max(120),
  principleByLevel: z
    .object({
      L1: z.string().max(300).optional().default(''),
      L2: z.string().max(300).optional().default(''),
      L3: z.string().max(300).optional().default(''),
    })
    .optional()
    .nullable(),
  videoTitle: z.string().max(60).optional().nullable(),
  videoDurationSec: z.number().int().optional().nullable(),
  principleVideoUrl: mediaUrl().optional().nullable(),
  explodedImageUrl: mediaUrl().optional().nullable(),
  parts: z
    .array(
      z.object({
        no: z.string().max(10),
        name: z.string().max(40),
        desc: z.string().max(300),
        x: z.number(),
        y: z.number(),
      })
    )
    .optional()
    .nullable(),
  scenePosition: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .optional()
    .nullable(),
  sortOrder: z.number().int().optional().default(0),
});
export type ItemCreateInput = z.infer<typeof ItemCreateSchema>;

export const ItemUpdateSchema = ItemCreateSchema.partial();
export type ItemUpdateInput = z.infer<typeof ItemUpdateSchema>;

// ---- 知识点 ----
export const KnowledgePointCreateSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(60),
  subject: z.enum(['PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'GEOGRAPHY', 'OTHER']),
  difficulty: z.enum(['L1', 'L2', 'L3']),
  summary: z.string().max(200).optional().nullable(),
  content: z.string().min(1), // 简化：MVP 用纯文本/Markdown 字符串
  illustrationUrl: mediaUrl().optional().nullable(),
  videoTitle: z.string().max(60).optional().nullable(),
  videoDurationSec: z.number().int().optional().nullable(),
  videoUrl: mediaUrl().optional().nullable(),
  itemIds: z.array(z.string()).optional().default([]),
});
export type KnowledgePointCreateInput = z.infer<typeof KnowledgePointCreateSchema>;

export const KnowledgePointUpdateSchema = KnowledgePointCreateSchema.partial();
export type KnowledgePointUpdateInput = z.infer<typeof KnowledgePointUpdateSchema>;

// ---- 实验 ----
export const ExperimentCreateSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, '只允许小写字母、数字、短横线'),
  name: z.string().min(1).max(60),
  difficulty: z.enum(['L1', 'L2', 'L3']),
  durationMin: z.number().int().min(1).max(600).optional().default(10),
  needParent: z.boolean().optional().default(false),
  materialType: z.string().max(20).optional().nullable(),
  description: z.string().min(1).max(1000),
  materialsHome: z.array(z.string().max(60)).optional().nullable(),
  materialsKit: z.array(z.string().max(60)).optional().nullable(),
  safety: z.string().max(500).optional().nullable(),
  coverUrl: mediaUrl().optional().nullable(),
  videoUrl: mediaUrl().optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
  itemIds: z.array(z.string()).optional().default([]),
  knowledgePointIds: z.array(z.string()).optional().default([]),
});
export type ExperimentCreateInput = z.infer<typeof ExperimentCreateSchema>;

export const ExperimentUpdateSchema = ExperimentCreateSchema.partial();
export type ExperimentUpdateInput = z.infer<typeof ExperimentUpdateSchema>;

// ---- 考考你 · 小测题 ----
export const QuizQuestionCreateSchema = z.object({
  question: z.string().min(1).max(300),
  choices: z.array(z.string().min(1).max(120)).length(4, '需要 4 个选项'),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().max(500).optional().nullable(),
  difficulty: z.enum(['L1', 'L2', 'L3']).optional().default('L1'),
  sortOrder: z.number().int().optional().default(0),
});
export type QuizQuestionCreateInput = z.infer<typeof QuizQuestionCreateSchema>;

export const QuizQuestionUpdateSchema = QuizQuestionCreateSchema.partial();
export type QuizQuestionUpdateInput = z.infer<typeof QuizQuestionUpdateSchema>;

// ---- 知识点关联（知识网络边） ----
export const SetKnowledgeRelationsSchema = z.object({
  relatedIds: z.array(z.string()),
});
export type SetKnowledgeRelationsInput = z.infer<typeof SetKnowledgeRelationsSchema>;

// ---- 物品布局 ----
export const ItemLayoutSchema = z.object({
  itemId: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});
export const UpdateItemLayoutsSchema = z.array(ItemLayoutSchema);
