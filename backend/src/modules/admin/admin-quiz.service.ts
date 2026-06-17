import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '@oisee/shared';
import type { QuizQuestionCreateInput, QuizQuestionUpdateInput } from '@oisee/shared';

@Injectable()
export class AdminQuizService {
  constructor(private prisma: PrismaService) {}

  // ───────── 小测题 ─────────
  async listQuiz(knowledgePointId: string) {
    await this.ensureKpExists(knowledgePointId);
    return this.prisma.quizQuestion.findMany({
      where: { knowledgePointId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createQuiz(knowledgePointId: string, data: QuizQuestionCreateInput) {
    await this.ensureKpExists(knowledgePointId);
    return this.prisma.quizQuestion.create({
      data: { ...data, knowledgePointId } as any,
    });
  }

  async updateQuiz(id: string, data: QuizQuestionUpdateInput) {
    await this.ensureQuizExists(id);
    return this.prisma.quizQuestion.update({ where: { id }, data: data as any });
  }

  async removeQuiz(id: string) {
    await this.ensureQuizExists(id);
    await this.prisma.quizQuestion.delete({ where: { id } });
    return { ok: true };
  }

  // ───────── 知识网络关系 ─────────
  /** 返回与该知识点双向关联的全部 KP id 列表 */
  async getRelations(id: string) {
    await this.ensureKpExists(id);
    const [from, to] = await Promise.all([
      this.prisma.knowledgeRelation.findMany({ where: { fromId: id }, select: { toId: true } }),
      this.prisma.knowledgeRelation.findMany({ where: { toId: id }, select: { fromId: true } }),
    ]);
    const relatedIds = [...new Set([...from.map((r) => r.toId), ...to.map((r) => r.fromId)])];
    return { relatedIds };
  }

  /** 整体重写该知识点的双向关联（统一存为 from=当前KP） */
  async setRelations(id: string, relatedIds: string[]) {
    await this.ensureKpExists(id);
    const unique = [...new Set(relatedIds)].filter((rid) => rid !== id);
    await this.prisma.$transaction(async (tx) => {
      await tx.knowledgeRelation.deleteMany({
        where: { OR: [{ fromId: id }, { toId: id }] },
      });
      if (unique.length > 0) {
        await tx.knowledgeRelation.createMany({
          data: unique.map((toId) => ({ fromId: id, toId })),
          skipDuplicates: true,
        });
      }
    });
    return { ok: true, count: unique.length };
  }

  private async ensureKpExists(id: string) {
    const kp = await this.prisma.knowledgePoint.findFirst({ where: { id, deletedAt: null } });
    if (!kp) throw new BusinessException(ERROR_CODES.NOT_FOUND, '知识点不存在');
  }

  private async ensureQuizExists(id: string) {
    const q = await this.prisma.quizQuestion.findUnique({ where: { id } });
    if (!q) throw new BusinessException(ERROR_CODES.NOT_FOUND, '小测题不存在');
  }
}
