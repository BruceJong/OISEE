/**
 * 知识点关联（KnowledgeRelation）冷启动
 *
 * - 不同物品共用同一个 KP：已经通过 ItemKnowledgePoint M:N 关联实现
 *   （seed-items-v1 中已经存在大量复用，例如 "kp-electric-circuit"
 *    同时挂载在 router / printer / pos / motor / ...）
 *
 * - 知识点之间的语义关联：本脚本批量 upsert KnowledgeRelation 表
 *   方向：from → to；同一对会被存为「双向」（同时插 fromA→B 与 fromB→A）
 *   relationType 字段简单分类：related / parent / child / similar
 *
 * 运行：cd code/apps/api && npx tsx prisma/seed-kp-relations.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/* ────────────────────────────────────────────────────────────────
   关联清单
   每条 [fromSlug, toSlug, type]，type 可选（默认 'related'）
──────────────────────────────────────────────────────────────── */
const RELATIONS: Array<[string, string, string?]> = [
  // ── 力学集群 ─────────────────────────────────────────────────
  ['kp-gravity',           'kp-newton-2'],
  ['kp-gravity',           'kp-incline'],
  ['kp-gravity',           'kp-pressure'],
  ['kp-friction',          'kp-incline'],
  ['kp-friction',          'kp-energy-cons'],
  ['kp-lever',             'kp-pulley'],
  ['kp-lever',             'kp-newton-2'],
  ['kp-pulley',            'kp-friction'],
  ['kp-energy-cons',       'kp-momentum'],
  ['kp-energy-cons',       'kp-elastic-collision'],
  ['kp-momentum',          'kp-elastic-collision'],
  ['kp-momentum',          'kp-newton-2'],
  ['kp-circular',          'kp-centripetal'],
  ['kp-centripetal',       'kp-newton-2'],
  ['kp-buoyancy',          'kp-pressure'],
  ['kp-buoyancy',          'kp-water-cycle'],
  ['kp-pressure',          'kp-newton-2'],
  ['kp-incline',           'kp-newton-2'],
  ['kp-elastic-collision', 'kp-newton-2'],

  // ── 热学集群 ─────────────────────────────────────────────────
  ['kp-heat-conduction',   'kp-convection'],
  ['kp-heat-conduction',   'kp-radiation'],
  ['kp-convection',        'kp-radiation'],
  ['kp-convection',        'kp-wind-flow'],
  ['kp-radiation',         'kp-em-wave',     'parent'],
  ['kp-phase-change',      'kp-refrigerant'],
  ['kp-phase-change',      'kp-evaporation'],
  ['kp-phase-change',      'kp-water-cycle'],
  ['kp-refrigerant',       'kp-heat-conduction'],
  ['kp-evaporation',       'kp-water-cycle'],
  ['kp-microwave',         'kp-em-wave',     'parent'],
  ['kp-microwave',         'kp-heat-conduction'],
  ['kp-thermal-expansion', 'kp-heat-conduction'],

  // ── 光学集群 ─────────────────────────────────────────────────
  ['kp-reflection',        'kp-refraction'],
  ['kp-refraction',        'kp-lens'],
  ['kp-refraction',        'kp-spectrum'],
  ['kp-color-mixing',      'kp-spectrum'],
  ['kp-color-mixing',      'kp-led'],
  ['kp-color-mixing',      'kp-pigment'],
  ['kp-polarization',      'kp-em-wave',     'parent'],
  ['kp-laser',             'kp-em-wave',     'parent'],
  ['kp-laser',             'kp-led'],
  ['kp-spectrum',          'kp-refraction'],
  ['kp-fluorescence',      'kp-spectrum'],
  ['kp-fluorescence',      'kp-led'],

  // ── 电磁集群 ─────────────────────────────────────────────────
  ['kp-electric-circuit',  'kp-electromagnetism'],
  ['kp-electromagnetism',  'kp-motor'],
  ['kp-motor',             'kp-electric-circuit'],
  ['kp-semiconductor',     'kp-led'],
  ['kp-semiconductor',     'kp-electric-circuit'],
  ['kp-led',               'kp-semiconductor'],
  ['kp-wifi',              'kp-em-wave',     'parent'],
  ['kp-em-wave',           'kp-electromagnetism'],
  ['kp-x-ray',             'kp-em-wave',     'parent'],
  ['kp-x-ray',             'kp-radiation'],
  ['kp-defibrillator',     'kp-electric-circuit'],
  ['kp-defibrillator',     'kp-circulation'],

  // ── 声学集群 ─────────────────────────────────────────────────
  ['kp-sound-wave',        'kp-resonance'],
  ['kp-sound-wave',        'kp-doppler'],
  ['kp-resonance',         'kp-doppler'],
  ['kp-ultrasound',        'kp-sound-wave', 'child'],

  // ── 化学集群 ─────────────────────────────────────────────────
  ['kp-acid-base',         'kp-dissolution'],
  ['kp-oxidation',         'kp-combustion'],
  ['kp-combustion',        'kp-oxidation'],
  ['kp-dissolution',       'kp-osmosis'],
  ['kp-dissolution',       'kp-emulsification'],
  ['kp-emulsification',    'kp-soap'],
  ['kp-co2-soda',          'kp-dissolution'],
  ['kp-co2-soda',          'kp-pressure'],
  ['kp-catalyst',          'kp-fermentation'],
  ['kp-polymer',           'kp-dye'],
  ['kp-pigment',           'kp-color-mixing'],
  ['kp-pigment',           'kp-dye'],
  ['kp-dye',               'kp-polymer'],
  ['kp-soap',              'kp-emulsification'],

  // ── 生物集群 ─────────────────────────────────────────────────
  ['kp-photosynthesis',    'kp-respiration'],
  ['kp-photosynthesis',    'kp-pigment'],
  ['kp-photosynthesis',    'kp-ecosystem'],
  ['kp-respiration',       'kp-circulation'],
  ['kp-pollination',       'kp-ecosystem'],
  ['kp-ecosystem',         'kp-soil'],
  ['kp-circulation',       'kp-immune'],
  ['kp-immune',            'kp-bacteria'],
  ['kp-pharma',            'kp-dissolution'],
  ['kp-sterilization',     'kp-bacteria'],
  ['kp-yeast',             'kp-fermentation'],
  ['kp-fermentation',      'kp-yeast'],
  ['kp-fermentation',      'kp-respiration'],

  // ── 地理/能源集群 ───────────────────────────────────────────
  ['kp-water-cycle',       'kp-evaporation'],
  ['kp-water-cycle',       'kp-phase-change'],
  ['kp-water-cycle',       'kp-weather'],
  ['kp-weather',           'kp-wind-flow'],
  ['kp-soil',              'kp-ecosystem'],
  ['kp-solar-energy',      'kp-em-wave', 'parent'],
  ['kp-solar-energy',      'kp-photosynthesis'],
  ['kp-solar-energy',      'kp-semiconductor'],
  ['kp-wind-flow',         'kp-convection'],
];

async function main() {
  console.log('🏗  写入 KnowledgeRelation 关联 …\n');

  // slug → id 映射
  const all = await prisma.knowledgePoint.findMany({
    where: { status: 'PUBLISHED', deletedAt: null },
    select: { id: true, slug: true },
  });
  const id = new Map(all.map(k => [k.slug, k.id]));

  let ok = 0, miss = 0;
  for (const [fromSlug, toSlug, type] of RELATIONS) {
    const fromId = id.get(fromSlug);
    const toId   = id.get(toSlug);
    if (!fromId || !toId) {
      console.warn(`  ✗ ${fromSlug} → ${toSlug}  (slug 不存在)`);
      miss++;
      continue;
    }
    // 正向
    await prisma.knowledgeRelation.upsert({
      where:  { fromId_toId: { fromId, toId } },
      update: { relationType: type ?? 'related' },
      create: { fromId, toId, relationType: type ?? 'related' },
    });
    // 反向（默认）—— parent/child 不做反向自动反转
    const reverseType = type === 'parent' ? 'child' : type === 'child' ? 'parent' : 'related';
    await prisma.knowledgeRelation.upsert({
      where:  { fromId_toId: { fromId: toId, toId: fromId } },
      update: { relationType: reverseType },
      create: { fromId: toId, toId: fromId, relationType: reverseType },
    });
    ok++;
  }

  const totalRel = await prisma.knowledgeRelation.count();
  console.log(`\n📊 已建立 ${ok} 对关联（${totalRel} 条有向记录）· 跳过 ${miss}`);

  // 统计：每个 KP 的关联度
  const top = await prisma.knowledgePoint.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      slug: true, name: true,
      _count: { select: { relatedFrom: true, items: true } },
    },
    orderBy: { name: 'asc' },
  });
  const ranked = top
    .map(t => ({ slug: t.slug, name: t.name, refs: t._count.relatedFrom, items: t._count.items }))
    .sort((a, b) => b.refs - a.refs);
  console.log('\n🔗 关联度 TOP 10：');
  for (const r of ranked.slice(0, 10)) {
    console.log(`   ${r.name.padEnd(8)}  ${r.refs} 关联 · ${r.items} 物品引用`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
