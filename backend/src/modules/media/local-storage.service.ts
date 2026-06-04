import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { nanoid } from 'nanoid';

@Injectable()
export class LocalStorageService {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor() {
    this.uploadDir = process.env.OISEE_UPLOAD_DIR ?? './uploads';
    this.baseUrl = process.env.OISEE_UPLOAD_BASE_URL ?? 'http://localhost:3000/uploads';
  }

  /**
   * 保存文件到本地 uploads 目录。
   * 按 purpose 分子目录，文件名用 nanoid + 原扩展名。
   * 返回可公开访问的 URL。
   */
  async save(
    purpose: string,
    file: Express.Multer.File
  ): Promise<{ url: string; objectKey: string; size: number; mime: string }> {
    const safeP = purpose.replace(/[^a-zA-Z0-9-_]/g, '');
    const yyyymm = new Date().toISOString().slice(0, 7).replace('-', '');
    const subDir = `${safeP}/${yyyymm}`;
    const fullDir = join(this.uploadDir, subDir);
    await fs.mkdir(fullDir, { recursive: true });

    const ext = extname(file.originalname) || this.guessExt(file.mimetype);
    const filename = `${nanoid()}${ext}`;
    const filepath = join(fullDir, filename);
    await fs.writeFile(filepath, file.buffer);

    const objectKey = `${subDir}/${filename}`;
    return {
      url: `${this.baseUrl}/${objectKey}`,
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
