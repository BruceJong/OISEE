import {
  Body, Controller, Get, Param, Post, Query, UseGuards, Request,
} from '@nestjs/common';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '@oisee/shared';
import { AdminAiTasksService } from './admin-ai-tasks.service';
import { AdminSettingsService } from './admin-settings.service';
import { extractVariables } from './ai-template-runner';
import { analyzeCallExample } from './llm-analyzer';

@Controller('admin/ai-tasks')
@UseGuards(JwtAdminGuard)
export class AdminAiTasksController {
  constructor(
    private svc: AdminAiTasksService,
    private settings: AdminSettingsService,
  ) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Request() req?: any,
  ) {
    return this.svc.list({ status, entityType, entityId, adminId: req.user?.sub });
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.svc.create({ ...body, adminId: req.user?.sub ?? 'unknown' });
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.svc.getOne(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.svc.cancel(id);
  }

  /** 解析调用模板，返回变量列表（用户配置时实时反馈） */
  @Post('parse-template')
  parseTemplate(@Body() body: { template: string }) {
    const vars = extractVariables(body.template ?? '');
    return { variables: vars };
  }

  /**
   * 用内置思考模型智能分析调用示例（默认 DeepSeek v4-pro，可在系统设置中更换）：
   * 输入原始 curl/HTTP 示例（带具体值），返回变量化模板 + 变量元数据 + 响应解析规则
   */
  @Post('analyze-example')
  async analyzeExample(@Body() body: { example: string }) {
    const cfg = await this.settings.get('ai_thinking_model');
    try {
      return await analyzeCallExample(body.example ?? '', cfg);
    } catch (e: any) {
      // 透传真实原因（思考模型 API 报错 / 超时等），避免被全局过滤器吞成 Internal server error
      throw new BusinessException(ERROR_CODES.INTERNAL_ERROR, e?.message ?? '分析失败');
    }
  }

  /**
   * 测试调用：跑一次模型 → 返回结果 URL（不入库 AiTask）
   * body.dynamicValues：所有动态变量的值（包括 prompt 等）
   */
  @Post('test')
  async test(@Body() body: { modelId: string; dynamicValues: Record<string, string> }) {
    try {
      return await this.svc.test(body.modelId, body.dynamicValues ?? {});
    } catch (e: any) {
      if (e instanceof BusinessException) throw e;
      // 透传真实原因（模型 API 报错 / 路径取不到等），避免被全局过滤器吞成 Internal server error
      throw new BusinessException(ERROR_CODES.INTERNAL_ERROR, e?.message ?? '测试调用失败');
    }
  }
}
