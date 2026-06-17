/**
 * 把 data/uploads/item-icons/{slug}.png 写入 item.iconUrl
 * 用法：cd backend && npx tsx prisma/seed-item-icons.ts
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();
const IMG_DIR  = '/Users/bruce/Desktop/BRUCE/coding/ohsee/data/uploads/item-icons';
const URL_BASE = 'http://localhost:3000/uploads/item-icons';

async function main() {
  if (!fs.existsSync(IMG_DIR)) {
    console.error(`目录不存在：${IMG_DIR}`);
    process.exit(1);
  }
  const files = fs.readdirSync(IMG_DIR).filter(f => f.endsWith('.png'));
  console.log(`找到 ${files.length} 个 PNG 图标\n`);

  let ok = 0, miss = 0;
  for (const fn of files) {
    const slug = path.basename(fn, '.png');
    const url = `${URL_BASE}/${fn}`;
    try {
      await prisma.item.update({ where: { slug }, data: { iconUrl: url } });
      ok++;
    } catch (e: any) {
      console.warn(`  ✗ ${slug}: ${e.code ?? e.message}`);
      miss++;
    }
  }
  const total = await prisma.item.count({ where: { status: 'PUBLISHED' } });
  const have  = await prisma.item.count({ where: { status: 'PUBLISHED', iconUrl: { not: null } } });
  console.log(`📊 写入 ${ok} 条 · 跳过 ${miss}`);
  console.log(`📷 PUBLISHED 有 iconUrl：${have}/${total}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
