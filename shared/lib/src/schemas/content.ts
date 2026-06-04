import { z } from 'zod';

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
  coverUrl: z.string().url().optional().nullable(),
  sceneImageUrl: z.string().url().optional().nullable(),
  iconKind: z.enum(['home', 'school', 'park', 'hospital', 'mall']).optional().nullable(),
  themeColor: z.enum(['sun', 'ocean', 'leaf', 'coral', 'berry']).optional().nullable(),
  isDefault: z.boolean().optional().default(false),
  unlockHint: z.string().max(100).optional().nullable(),
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
  coverUrl: z.string().url().optional().nullable(),
  itemImageUrl: z.string().url().optional().nullable(),
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
  principleVideoUrl: z.string().url().optional().nullable(),
  explodedImageUrl: z.string().url().optional().nullable(),
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
  illustrationUrl: z.string().url().optional().nullable(),
  itemIds: z.array(z.string()).optional().default([]),
});
export type KnowledgePointCreateInput = z.infer<typeof KnowledgePointCreateSchema>;

export const KnowledgePointUpdateSchema = KnowledgePointCreateSchema.partial();
export type KnowledgePointUpdateInput = z.infer<typeof KnowledgePointUpdateSchema>;

// ---- 物品布局 ----
export const ItemLayoutSchema = z.object({
  itemId: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});
export const UpdateItemLayoutsSchema = z.array(ItemLayoutSchema);
