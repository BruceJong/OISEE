/**
 * 存储抽象：本地磁盘 / 阿里云 OSS 两种实现共用。
 * 由 media.module 根据 OISEE_STORAGE_DRIVER 决定注入哪个实现。
 */
export interface StoredFile {
  url: string;
  objectKey: string;
  size: number;
  mime: string;
}

export interface StorageService {
  save(purpose: string, file: Express.Multer.File): Promise<StoredFile>;
}

/** DI token（用接口无法在运行时注入，需要显式 token） */
export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
