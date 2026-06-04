/**
 * 把 data/uploads/l2-scenes/{slug}.png 写入 scene.sceneImageUrl
 * 用法：cd code/apps/api && npx tsx prisma/seed-scene-images.ts
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();
const IMG_DIR = '/Users/bruce/Desktop/BRUCE/coding/ohsee/data/uploads/l2-scenes';
const URL_BASE = 'http://localhost:3000/uploads/l2-scenes';

async function main() {
  if (!fs.existsSync(IMG_DIR)) {
    console.error(`目录不存在：${IMG_DIR}`);
    process.exit(1);
  }
  const files = fs.readdirSync(IMG_DIR).filter(f => f.endsWith('.png'));
  console.log(`找到 ${files.length} 个 PNG 文件\n`);

  let ok = 0, miss = 0;
  for (const fn of files) {
    const slug = path.basename(fn, '.png');
    const url = `${URL_BASE}/${fn}`;
    try {
      await prisma.scene.update({
        where: { slug },
        data: { sceneImageUrl: url },
      });
      console.log(`  ✔ ${slug} → ${url}`);
      ok++;
    } catch (e: any) {
      console.warn(`  ✗ ${slug}: ${e.code ?? e.message}`);
      miss++;
    }
  }

  console.log(`\n📊 更新 ${ok} 条 · 跳过 ${miss} 条`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
