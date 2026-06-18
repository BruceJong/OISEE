/**
 * 一次性迁移：把本地 data/uploads 灌入 OSS bucket。
 * objectKey = 相对 data/uploads 的路径（如 scenes/kitchen-cover.png）。
 * 支持断点续传：OSS 上已存在的对象跳过。
 *
 * 运行（在 backend/ 下）：
 *   set -a; source ~/.oisee-secrets/aliyun.env; set +a
 *   pnpm exec tsx scripts/oss-upload.ts
 */
import OSS from 'ali-oss';
import { readdir } from 'fs/promises';
import { join, relative, sep } from 'path';

const UPLOAD_DIR = join(process.cwd(), process.env.OSS_LOCAL_DIR ?? '../data/uploads');
// 历史备份 + 测试产物，不入 OSS
const EXCLUDE_DIRS = new Set(['item-icons.v1-bak', 'item-icons.v2-bak', 'ai-test', 'e2e-test']);
const CONCURRENCY = 8;

const client = new OSS({
  region: 'oss-' + (process.env.OSS_REGION ?? 'cn-hangzhou'),
  accessKeyId: process.env.ALIYUN_AK_ID!,
  accessKeySecret: process.env.ALIYUN_AK_SECRET!,
  bucket: process.env.OSS_BUCKET!,
});

async function* walk(dir: string): AsyncGenerator<string> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (EXCLUDE_DIRS.has(e.name)) continue;
      yield* walk(join(dir, e.name));
    } else if (e.isFile() && !e.name.startsWith('.')) {
      yield join(dir, e.name);
    }
  }
}

async function main() {
  const files: string[] = [];
  for await (const f of walk(UPLOAD_DIR)) files.push(f);
  console.log(`📦 待处理 ${files.length} 个文件，来源 ${UPLOAD_DIR}`);

  let uploaded = 0,
    skipped = 0,
    failed = 0,
    processed = 0;

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (f) => {
        const key = relative(UPLOAD_DIR, f).split(sep).join('/');
        try {
          try {
            await client.head(key);
            skipped++;
            return; // 已存在，断点续传跳过
          } catch {
            /* 不存在则上传 */
          }
          await client.put(key, f, {
            headers: { 'Cache-Control': 'public, max-age=31536000' },
          });
          uploaded++;
        } catch (e) {
          failed++;
          console.error('  ✗', key, (e as Error).message);
        } finally {
          processed++;
        }
      })
    );
    if (i % 200 === 0 || i + CONCURRENCY >= files.length) {
      console.log(`  进度 ${processed}/${files.length}  上传 ${uploaded} 跳过 ${skipped} 失败 ${failed}`);
    }
  }
  console.log(`✅ 完成：上传 ${uploaded}，跳过 ${skipped}，失败 ${failed}，共 ${files.length}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
