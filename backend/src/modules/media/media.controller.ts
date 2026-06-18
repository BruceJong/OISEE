import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Query,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';
import { STORAGE_SERVICE, StorageService } from './storage.interface';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '@oisee/shared';

@Controller('admin/media')
@UseGuards(JwtAdminGuard)
export class MediaController {
  constructor(@Inject(STORAGE_SERVICE) private storage: StorageService) {}

  /**
   * 简化的"前端选文件 → POST 上传 → 返回 URL"
   * 存储后端由 OISEE_STORAGE_DRIVER 决定（本地磁盘 / 阿里云 OSS）
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('purpose') purpose = 'misc'
  ) {
    if (!file) {
      throw new BusinessException(ERROR_CODES.INVALID_PARAMS, '未提供文件');
    }
    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
      throw new BusinessException(ERROR_CODES.INVALID_PARAMS, '仅支持图片或视频');
    }
    return this.storage.save(purpose, file);
  }
}
