import { Injectable, Logger } from '@nestjs/common';
import OSS from 'ali-oss';
import { extname } from 'path';
import { nanoid } from 'nanoid';
import { StorageService, StoredFile } from './storage.interface';

/**
 * 阿里云 OSS 存储实现。
 * - 上传：ECS 上设 OISEE_OSS_INTERNAL=true 走内网 endpoint（免流量费、低延迟）。
 * - 返回 URL：用公开外网/CDN 基址（前端 <img> 用），与上传连接分开。
 */
@Injectable()
export class OssStorageService implements StorageService {
  private readonly logger = new Logger(OssStorageService.name);
  private readonly client: OSS;
  private readonly publicBaseUrl: string;

  constructor() {
    const region = process.env.OISEE_OSS_REGION ?? 'cn-hangzhou';
    const bucket = process.env.OISEE_OSS_BUCKET;
    this.client = new OSS({
      region: `oss-${region}`,
      accessKeyId: process.env.OISEE_OSS_AK_ID!,
      accessKeySecret: process.env.OISEE_OSS_AK_SECRET!,
      bucket,
      internal: process.env.OISEE_OSS_INTERNAL === 'true',
      secure: true,
    });
    this.publicBaseUrl = (
      process.env.OISEE_OSS_PUBLIC_BASE_URL ??
      `https://${bucket}.oss-${region}.aliyuncs.com`
    ).replace(/\/$/, '');
    this.logger.log(`OSS storage 已启用 bucket=${bucket} region=${region} base=${this.publicBaseUrl}`);
  }

  async save(purpose: string, file: Express.Multer.File): Promise<StoredFile> {
    const safeP = purpose.replace(/[^a-zA-Z0-9-_]/g, '');
    const yyyymm = new Date().toISOString().slice(0, 7).replace('-', '');
    const ext = extname(file.originalname) || this.guessExt(file.mimetype);
    const objectKey = `${safeP}/${yyyymm}/${nanoid()}${ext}`;

    await this.client.put(objectKey, file.buffer, {
      headers: {
        'Cache-Control': 'public, max-age=31536000',
        'Content-Type': file.mimetype,
      },
    });

    return {
      url: `${this.publicBaseUrl}/${objectKey}`,
      objectKey,
      size: file.size,
      mime: file.mimetype,
    };
  }

  private guessExt(mime: string): string {
    const map: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
    };
    return map[mime] ?? '';
  }
}
