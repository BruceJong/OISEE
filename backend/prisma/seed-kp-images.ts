/**
 * 把 data/uploads/kp/{slug}.png 写入 knowledgePoint.illustrationUrl
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();
const IMG_DIR = '/Users/bruce/Desktop/BRUCE/coding/ohsee/data/uploads/kp';
const URL_BASE = 'http://localhost:3000/uploads/kp';

async function main() {
  const files = fs.readdirSync(IMG_DIR).filter(f => f.endsWith('.png'));
  let ok = 0, miss = 0;
  for (const fn of files) {
    const slug = path.basename(fn, '.png');
    const url = `${URL_BASE}/${fn}`;
    try {
      await prisma.knowledgePoint.update({
        where: { slug },
        data: { illustrationUrl: url },
      });
      ok++;
    } catch (e: any) {
      console.warn(`  ✗ ${slug}: ${e.code ?? e.message}`);
      miss++;
    }
  }
  const total = await prisma.knowledgePoint.count({
    where: { status: 'PUBLISHED', illustrationUrl: { not: null } },
  });
  const all = await prisma.knowledgePoint.count({ where: { status: 'PUBLISHED' } });
  console.log(`📊 更新 ${ok} 条 · 跳过 ${miss}`);
  console.log(`🖼 当前 PUBLISHED KP 有图：${total}/${all}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
