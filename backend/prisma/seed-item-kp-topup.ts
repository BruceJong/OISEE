/**
 * 物品 KP 补足：每个 PUBLISHED 物品保证 ≥3 个 KP
 *
 * 策略：
 *   - 只补缺，已经 ≥3 的物品不动
 *   - 优先复用已有 KP（KnowledgePoint 表里已有的）
 *   - 一个 KP 可被多个物品引用（M:N，本就支持）
 *   - 本脚本完全 idempotent，可重复跑
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/* 手工指定每个缺漏物品需要补的 KP slugs（按物品语义挑选） */
const TOP_UP: Record<string, string[]> = {
  // 燃气灶：火苗加热锅底 → 热传导
  'stove':      ['kp-heat-conduction'],

  // 菜刀：切割（接触面摩擦）+ 生锈（氧化）
  'knife':      ['kp-friction', 'kp-oxidation'],

  // 抽油烟机：高速气流形成低压区（伯努利已有），补"压强差"作为动力来源
  'range-hood': ['kp-pressure'],

  // 电视机：屏幕发光 + 三原色合成 + 信号传输
  'tv':         ['kp-led', 'kp-color-mixing', 'kp-em-wave'],
};

async function main() {
  console.log('🔧 物品 KP 补足 …\n');

  let added = 0, skipped = 0;
  for (const [itemSlug, kpSlugs] of Object.entries(TOP_UP)) {
    const item = await prisma.item.findUnique({
      where: { slug: itemSlug },
      include: { knowledgePoints: { select: { knowledgePointId: true } } },
    });
    if (!item) {
      console.warn(`  ✗ item ${itemSlug} 不存在`);
      continue;
    }
    const existingIds = new Set(item.knowledgePoints.map(k => k.knowledgePointId));

    for (let i = 0; i < kpSlugs.length; i++) {
      const slug = kpSlugs[i]!;
      const kp = await prisma.knowledgePoint.findUnique({ where: { slug } });
      if (!kp) {
        console.warn(`     - kp ${slug} 不存在，跳过`);
        continue;
      }
      if (existingIds.has(kp.id)) {
        console.log(`     · ${itemSlug} 已有 ${slug}，skip`);
        skipped++;
        continue;
      }
      await prisma.itemKnowledgePoint.create({
        data: {
          itemId: item.id,
          knowledgePointId: kp.id,
          sortOrder: item.knowledgePoints.length + i,
        },
      });
      console.log(`     + ${itemSlug}  ←  ${slug}`);
      added++;
    }
  }

  console.log(`\n📊 新增 ${added} 条关联 · 跳过 ${skipped} 条`);

  // 二次审核
  const short = await prisma.item.findMany({
    where: { status: 'PUBLISHED', deletedAt: null },
    include: { _count: { select: { knowledgePoints: true } } },
  });
  const stillShort = short.filter(s => s._count.knowledgePoints < 3);
  if (stillShort.length === 0) {
    console.log(`✅ 所有 ${short.length} 个物品都达到 ≥3 KP`);
  } else {
    console.log(`⚠️  仍有 ${stillShort.length} 个物品 <3 KP:`);
    for (const s of stillShort) console.log(`   ${s.slug} (${s._count.knowledgePoints})`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
