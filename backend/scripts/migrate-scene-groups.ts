/**
 * 数据迁移脚本：将现有 Scene 数据关联到 SceneGroup
 *
 * 现有数据结构：
 *   - groupName = '__l1' 的 Scene 是一级场景，转为 SceneGroup
 *   - 其余 Scene 的 groupName 与对应一级场景的 slug 相同，建立 sceneGroupId 关联
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 一级场景配置（补充 iconKind / themeColor）
const L1_META: Record<string, { iconKind: string; themeColor: string; description: string }> = {
  'loc-home':    { iconKind: 'home',     themeColor: 'sun',   description: '家中各个房间，探索日常生活中的科学' },
  'park':        { iconKind: 'park',     themeColor: 'leaf',  description: '公园里的自然与运动，感受户外科学' },
  'school':      { iconKind: 'school',   themeColor: 'ocean', description: '校园里的学习与探索，课本之外的发现' },
  'hospital':    { iconKind: 'hospital', themeColor: 'coral', description: '医院中的医疗科技，了解人体与健康' },
  'supermarket': { iconKind: 'mall',     themeColor: 'berry', description: '超市里的商品与技术，生活中的科学' },
  'mall':        { iconKind: 'mall',     themeColor: 'sun',   description: '商场里的娱乐与消费，探索现代科技' },
  'playground':  { iconKind: 'park',     themeColor: 'coral', description: '游乐场里的物理力学，玩中学科学' },
};

async function main() {
  console.log('🚀 开始迁移 SceneGroup 数据...\n');

  // ── 1. 查出所有一级场景（groupName = '__l1'）──
  const l1Scenes = await prisma.scene.findMany({
    where: { groupName: '__l1', deletedAt: null },
    orderBy: { sortOrder: 'asc' },
  });
  console.log(`✅ 找到 ${l1Scenes.length} 个一级场景：${l1Scenes.map((s) => s.name).join('、')}\n`);

  // ── 2. 为每个一级场景创建 SceneGroup（已存在则 upsert）──
  const groupSlugToId: Record<string, string> = {};

  for (const scene of l1Scenes) {
    const meta = L1_META[scene.slug] ?? { iconKind: 'home', themeColor: 'sun', description: '' };

    const sg = await prisma.sceneGroup.upsert({
      where: { slug: scene.slug },
      create: {
        slug: scene.slug,
        name: scene.name,
        description: meta.description,
        iconKind: meta.iconKind,
        themeColor: meta.themeColor,
        sortOrder: scene.sortOrder,
        status: scene.status,
      },
      update: {
        name: scene.name,
        description: meta.description,
        iconKind: meta.iconKind,
        themeColor: meta.themeColor,
        sortOrder: scene.sortOrder,
        status: scene.status,
      },
    });

    groupSlugToId[scene.slug] = sg.id;
    console.log(`  ✓ SceneGroup: ${sg.name} (${sg.slug}) → id=${sg.id}`);
  }

  // ── 3. 更新二级场景的 sceneGroupId ──
  console.log('\n🔗 建立二级场景关联...\n');

  const subScenes = await prisma.scene.findMany({
    where: { groupName: { not: '__l1' }, deletedAt: null },
    orderBy: [{ groupName: 'asc' }, { sortOrder: 'asc' }],
  });

  let linked = 0;
  let skipped = 0;

  for (const scene of subScenes) {
    const groupId = groupSlugToId[scene.groupName];
    if (!groupId) {
      console.warn(`  ⚠️  ${scene.name} (${scene.slug}) groupName="${scene.groupName}" 无对应 SceneGroup，跳过`);
      skipped++;
      continue;
    }
    await prisma.scene.update({
      where: { id: scene.id },
      data: { sceneGroupId: groupId },
    });
    linked++;
  }

  console.log(`  ✓ 已关联 ${linked} 个二级场景，跳过 ${skipped} 个\n`);

  // ── 4. 打印最终结构 ──
  console.log('📊 最终结构：\n');
  const groups = await prisma.sceneGroup.findMany({
    where: { deletedAt: null },
    orderBy: { sortOrder: 'asc' },
    include: {
      scenes: {
        where: { deletedAt: null, status: { not: 'ARCHIVED' } },
        orderBy: { sortOrder: 'asc' },
        select: { name: true, slug: true, status: true },
      },
      _count: { select: { scenes: true } },
    },
  });

  for (const g of groups) {
    console.log(`  📁 ${g.name} (${g.slug}) [${g.status}] — ${g._count.scenes} 个场景`);
    for (const s of g.scenes) {
      console.log(`    └─ ${s.name} (${s.slug}) [${s.status}]`);
    }
  }

  console.log('\n✅ 迁移完成！');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
