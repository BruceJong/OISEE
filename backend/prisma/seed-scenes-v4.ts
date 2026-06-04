/**
 * 场景冷启动数据 v4
 *
 * 关键变化（vs v3）：
 *   • 新增 cleanup step：将不在本 v4 清单内的旧场景（v2/v3 残留）置为 ARCHIVED，
 *     避免重名（如「滑梯」「操场」同名多份）和未来误展示。
 *   • L1 场景统一 groupName = '__l1'，避免 L1 自引用进入自己的 L2 列表
 *     （前端 InfoPanel 之前出现"超市里有个二级场景也叫超市"的根因）。
 *   • 仍然 idempotent upsert，可重复执行。
 *
 * 运行：cd code/apps/api && npx tsx prisma/seed-scenes-v4.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const L1_GROUP = '__l1'; // L1 专用 group，与所有 L2 groupName 都不同

// ── 7 个一级地点 ────────────────────────────────────────────────
// groupName 统一为 '__l1'，slug 是建筑的稳定标识
const L1_LOCATIONS = [
  { slug: 'loc-home',    name: '我的家',  description: '家是你最熟悉的科学实验室。厨房、客厅、浴室……每个角落都藏着一套科学原理。', iconKind: 'home',        themeColor: 'sun',   isDefault: true, sortOrder: 0  },
  { slug: 'park',        name: '公园',    description: '风、光合作用、水的循环……公园是最大的户外自然科学课堂。',                             iconKind: 'park',        themeColor: 'leaf',                   sortOrder: 10 },
  { slug: 'school',      name: '学校',    description: '教室、实验室、操场——这里的每一处都是学科知识真正发生的地方。',                       iconKind: 'school',      themeColor: 'ocean',                  sortOrder: 20 },
  { slug: 'hospital',    name: '医院',    description: 'X 光、心跳监测、药物——医院是物理、化学与生命科学的交汇点。',                          iconKind: 'hospital',    themeColor: 'coral',                  sortOrder: 30 },
  { slug: 'supermarket', name: '超市',    description: '冷冻、保鲜、称重、结账——超市里每个环节都有一段科学故事。',                              iconKind: 'supermarket', themeColor: 'sun',                    sortOrder: 40 },
  { slug: 'mall',        name: '商场',    description: '扶梯、空调、电影放映——商场是最密集的应用科技体验空间。',                                iconKind: 'mall',        themeColor: 'plum',                   sortOrder: 50 },
  { slug: 'playground',  name: '游乐场',  description: '过山车、摩天轮、旋转木马——刺激背后是力学与运动学的完美演示。',                        iconKind: 'playground',  themeColor: 'berry',                  sortOrder: 60 },
];

// ── 42 个二级子场景 ─────────────────────────────────────────────
// groupName = 所属 L1 的 slug；unlockHint 非空 → 锁定
type L2 = {
  slug: string;
  name: string;
  groupName: string;
  description: string;
  themeColor: string;
  sortOrder: number;
  unlockHint?: string;
};

const L2_SCENES: L2[] = [
  // ─── 家 (6) ────────────────────────────────────────────────
  { slug: 'home-kitchen',   name: '厨房',     groupName: 'loc-home',  themeColor: 'amber',  sortOrder: 0, description: '冰箱、燃气灶、微波炉……厨房里的每个电器都是一门浓缩的物理课。' },
  { slug: 'home-living',    name: '客厅',     groupName: 'loc-home',  themeColor: 'sun',    sortOrder: 1, description: '电视、空调、Wi-Fi 路由器——客厅里聚集了最多的家用电子科技。' },
  { slug: 'home-bath',      name: '卫生间',   groupName: 'loc-home',  themeColor: 'ocean',  sortOrder: 2, description: '热水器、马桶水箱、镜子起雾……卫生间是流体力学的微型实验室。' },
  { slug: 'home-bedroom',   name: '卧室',     groupName: 'loc-home',  themeColor: 'plum',   sortOrder: 3, description: '空调、台灯、加湿器……卧室里的舒适来自一套精密的环境控制科学。' },
  { slug: 'home-study',     name: '书房',     groupName: 'loc-home',  themeColor: 'leaf',   sortOrder: 4, description: '电脑、打印机、台灯——书房是信息与光学技术最集中的家居空间。' },
  { slug: 'home-balcony',   name: '阳台',     groupName: 'loc-home',  themeColor: 'leaf',   sortOrder: 5, description: '晾衣架、绿植、太阳能——阳台是观察自然能量循环的最佳窗口。', unlockHint: '完成「厨房」「客厅」探索后解锁' },

  // ─── 公园 (5) ──────────────────────────────────────────────
  { slug: 'park-lawn',      name: '草坪',     groupName: 'park',  themeColor: 'leaf',   sortOrder: 0, description: '光合作用、露水蒸发、草叶的绿……草坪是最大的户外化学实验台。' },
  { slug: 'park-lake',      name: '湖边',     groupName: 'park',  themeColor: 'ocean',  sortOrder: 1, description: '水的浮力、折射、波纹……湖边把光学与水动力学变得触手可及。' },
  { slug: 'park-flower',    name: '花圃',     groupName: 'park',  themeColor: 'berry',  sortOrder: 2, description: '花色、花香、蜜蜂授粉——花圃里隐藏着色素化学与生态系统的精彩互动。' },
  { slug: 'park-fitness',   name: '健身区',   groupName: 'park',  themeColor: 'amber',  sortOrder: 3, description: '椭圆机、单杠、跷跷板器材——每一件都是一道力学应用题。' },
  { slug: 'park-pavilion',  name: '凉亭',     groupName: 'park',  themeColor: 'sun',    sortOrder: 4, description: '风的流向、声音的回响、阴影的角度——凉亭里能感受很多看不见的物理量。', unlockHint: '探索 3 个公园场景后解锁' },

  // ─── 学校 (6) ──────────────────────────────────────────────
  { slug: 'school-classroom', name: '教室',       groupName: 'school',  themeColor: 'ocean',  sortOrder: 0, description: '黑板、投影仪、荧光灯……教室里每件设备都是一节物理课。' },
  { slug: 'school-lab',       name: '实验室',     groupName: 'school',  themeColor: 'amber',  sortOrder: 1, description: '酒精灯、烧杯、天平——动手验证的地方，每次实验都是一次科学闭环。' },
  { slug: 'school-sports',    name: '操场',       groupName: 'school',  themeColor: 'leaf',   sortOrder: 2, description: '跑步、投篮、滑轮组——操场把运动学、力学变成了真实的身体感受。' },
  { slug: 'school-library',   name: '校园图书馆', groupName: 'school',  themeColor: 'plum',   sortOrder: 3, description: '纸张、油墨、荧光灯……安静的图书馆里隐藏着材料学与光学的故事。' },
  { slug: 'school-cafeteria', name: '食堂',       groupName: 'school',  themeColor: 'sun',    sortOrder: 4, description: '蒸汽、保温餐车、热汤——食堂是热传导的真实演示场。', unlockHint: '完成「教室」「实验室」探索后解锁' },
  { slug: 'school-art',       name: '美术室',     groupName: 'school',  themeColor: 'berry',  sortOrder: 5, description: '颜料化学、光与色、纸张吸水——美术室是色彩科学最直观的现场。', unlockHint: '探索 4 个学校场景后解锁' },

  // ─── 医院 (6) ──────────────────────────────────────────────
  { slug: 'hospital-emergency', name: '急诊室',   groupName: 'hospital', themeColor: 'coral', sortOrder: 0, description: '心电图、除颤仪、输液架——急诊室是生命科学最紧张的应用现场。' },
  { slug: 'hospital-xray',      name: 'X 光室',   groupName: 'hospital', themeColor: 'ocean', sortOrder: 1, description: 'X 射线能穿透皮肤看见骨骼——背后是电磁波与物质相互作用的量子故事。' },
  { slug: 'hospital-pharmacy',  name: '药房',     groupName: 'hospital', themeColor: 'leaf',  sortOrder: 2, description: '溶解、缓释、剂量——药房是化学与生物学最精密的零售现场。' },
  { slug: 'hospital-waiting',   name: '候诊室',   groupName: 'hospital', themeColor: 'sun',   sortOrder: 3, description: '体温计、血压仪、消毒剂——等待区里每样东西都在做安静的物理或化学工作。' },
  { slug: 'hospital-surgery',   name: '手术室',   groupName: 'hospital', themeColor: 'plum',  sortOrder: 4, description: '无影灯、麻醉机、缝合线——手术室汇聚了人类对身体最精细的工程能力。', unlockHint: '探索 3 个医院场景后解锁' },
  { slug: 'hospital-ward',      name: '病房',     groupName: 'hospital', themeColor: 'berry', sortOrder: 5, description: '点滴、呼叫铃、可调床——病房中的细节都是康复科学的一部分。', unlockHint: '完成「急诊室」「药房」后解锁' },

  // ─── 超市 (5) —— 注意：不可再有名为「超市」的 L2 ─────────────
  { slug: 'super-fresh',    name: '生鲜区',   groupName: 'supermarket', themeColor: 'leaf',  sortOrder: 0, description: '低温保鲜、喷雾加湿、颜色指示新鲜——生鲜区是食品科学的展示台。' },
  { slug: 'super-frozen',   name: '冷冻区',   groupName: 'supermarket', themeColor: 'ocean', sortOrder: 1, description: '压缩机、制冷剂、相变储能——冷冻柜把热力学第二定律变成了日常温度。' },
  { slug: 'super-drinks',   name: '饮料区',   groupName: 'supermarket', themeColor: 'sun',   sortOrder: 2, description: '碳酸、pH 值、渗透压——货架上的每瓶饮料都是一瓶化学溶液。' },
  { slug: 'super-checkout', name: '收银台',   groupName: 'supermarket', themeColor: 'amber', sortOrder: 3, description: '条形码、激光扫描、电子秤——收银台是光学与精密测量的迷你舞台。' },
  { slug: 'super-bakery',   name: '烘焙区',   groupName: 'supermarket', themeColor: 'coral', sortOrder: 4, description: '酵母发酵、烤箱热辐射、面团结构——烘焙区是厨房化学的浓缩版。', unlockHint: '完成「生鲜区」「饮料区」后解锁' },

  // ─── 商场 (5) ──────────────────────────────────────────────
  { slug: 'mall-electronics', name: '电器店',    groupName: 'mall', themeColor: 'ocean', sortOrder: 0, description: '电磁感应、半导体、超声波——展示区里每件电器都有一段工作原理。' },
  { slug: 'mall-food',        name: '美食广场', groupName: 'mall', themeColor: 'amber', sortOrder: 1, description: '明火烹饪、蒸汽、微波——美食广场汇聚了厨房科学的所有传热方式。' },
  { slug: 'mall-cinema',      name: '电影院',    groupName: 'mall', themeColor: 'plum',  sortOrder: 2, description: '投影、杜比音效、3D 偏振光——电影院是光学与声学技术的顶级展演空间。' },
  { slug: 'mall-arcade',      name: '游戏厅',    groupName: 'mall', themeColor: 'coral', sortOrder: 3, description: '传感器、LED 阵列、电机控制——街机柜里藏着一整套电子工程学的知识。' },
  { slug: 'mall-clothing',    name: '服装店',    groupName: 'mall', themeColor: 'berry', sortOrder: 4, description: '纺织纤维、染色化学、镜面反射——服装店是材料科学的城市侧。', unlockHint: '完成「电器店」「美食广场」后解锁' },

  // ─── 游乐场 (6) ─────────────────────────────────────────────
  { slug: 'play-carousel', name: '旋转木马', groupName: 'playground', themeColor: 'berry', sortOrder: 0, description: '匀速圆周运动、向心力、平衡——旋转木马让孩子亲身体验牛顿第二定律。' },
  { slug: 'play-coaster',  name: '过山车',   groupName: 'playground', themeColor: 'coral', sortOrder: 1, description: '势能转化为动能、失重、g 力——过山车是能量守恒定律最刺激的演示装置。' },
  { slug: 'play-seesaw',   name: '跷跷板',   groupName: 'playground', themeColor: 'sun',   sortOrder: 2, description: '杠杆原理、支点、力矩——小小跷跷板让阿基米德定律变得有趣。' },
  { slug: 'play-slide',    name: '滑梯',     groupName: 'playground', themeColor: 'leaf',  sortOrder: 3, description: '摩擦力、重力分力、加速度——滑梯是最简单也最完整的斜面力学实验。' },
  { slug: 'play-ferris',   name: '摩天轮',   groupName: 'playground', themeColor: 'ocean', sortOrder: 4, description: '巨大的圆周运动、视差、俯瞰几何——摩天轮把高度与时间一起变成感受。', unlockHint: '探索 3 个游乐场场景后解锁' },
  { slug: 'play-bumper',   name: '碰碰车',   groupName: 'playground', themeColor: 'plum',  sortOrder: 5, description: '动量守恒、弹性碰撞、电刷供电——碰碰车是力学碰撞实验的童年版。', unlockHint: '完成「过山车」「旋转木马」后解锁' },
];

/* ── 校验：所有名字必须唯一 ──────────────────────────────────── */
function assertUniqueNames() {
  const allNames = [...L1_LOCATIONS.map(l => l.name), ...L2_SCENES.map(l => l.name)];
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const n of allNames) {
    if (seen.has(n)) dups.add(n);
    seen.add(n);
  }
  if (dups.size > 0) {
    throw new Error(`场景名重复：${[...dups].join(', ')}`);
  }
  // L2 不能与 L1 同名
  const l1Names = new Set(L1_LOCATIONS.map(l => l.name));
  for (const l2 of L2_SCENES) {
    if (l1Names.has(l2.name)) {
      throw new Error(`L2 [${l2.slug}] 名称「${l2.name}」与 L1 重复`);
    }
  }
}

async function main() {
  console.log('🏗  开始写入场景冷启动数据 v4…\n');
  assertUniqueNames();
  console.log('✔ 名称唯一性校验通过\n');

  // ── 1. 计算合法 slug 集合 ─────────────────────────────────
  const validSlugs = new Set<string>([
    ...L1_LOCATIONS.map(l => l.slug),
    ...L2_SCENES.map(l => l.slug),
  ]);

  // ── 2. 找出 DB 中不在合法集合的"残留"场景 → 置 ARCHIVED ──
  const allExisting = await prisma.scene.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, slug: true, name: true, groupName: true },
  });
  const stale = allExisting.filter(s => !validSlugs.has(s.slug));
  if (stale.length > 0) {
    console.log(`🧹 发现 ${stale.length} 个残留场景，归档：`);
    for (const s of stale) {
      console.log(`   ⤷ ARCHIVE [${s.groupName}] ${s.name} (${s.slug})`);
    }
    await prisma.scene.updateMany({
      where: { slug: { in: stale.map(s => s.slug) } },
      data: { status: 'ARCHIVED' },
    });
    console.log('');
  }

  // ── 3. upsert 7 个 L1 ────────────────────────────────────
  for (const loc of L1_LOCATIONS) {
    await prisma.scene.upsert({
      where: { slug: loc.slug },
      update: {
        name: loc.name,
        groupName: L1_GROUP,            // 关键：L1 统一 group，避免自引用
        description: loc.description,
        iconKind: loc.iconKind,
        themeColor: loc.themeColor,
        sortOrder: loc.sortOrder,
        status: 'PUBLISHED',
        unlockHint: null,
      },
      create: {
        slug: loc.slug,
        name: loc.name,
        groupName: L1_GROUP,
        description: loc.description,
        iconKind: loc.iconKind,
        themeColor: loc.themeColor,
        isDefault: (loc as any).isDefault ?? false,
        sortOrder: loc.sortOrder,
        status: 'PUBLISHED',
      },
    });
    console.log(`✔ L1：${loc.name} (${loc.slug})`);
  }

  // ── 4. upsert L2 ──────────────────────────────────────────
  for (const sc of L2_SCENES) {
    await prisma.scene.upsert({
      where: { slug: sc.slug },
      update: {
        name: sc.name,
        groupName: sc.groupName,
        description: sc.description,
        iconKind: 'room',
        themeColor: sc.themeColor,
        sortOrder: sc.sortOrder,
        status: 'PUBLISHED',
        unlockHint: sc.unlockHint ?? null,
      },
      create: {
        slug: sc.slug,
        name: sc.name,
        groupName: sc.groupName,
        description: sc.description,
        iconKind: 'room',
        themeColor: sc.themeColor,
        isDefault: false,
        sortOrder: sc.sortOrder,
        status: 'PUBLISHED',
        unlockHint: sc.unlockHint ?? null,
      },
    });
    const lockTag = sc.unlockHint ? ' 🔒' : '';
    console.log(`  ✔ L2 [${sc.groupName}] ${sc.name}${lockTag}`);
  }

  // ── 5. 统计 ──────────────────────────────────────────────
  const total = await prisma.scene.count({ where: { status: 'PUBLISHED' } });
  const locked = await prisma.scene.count({
    where: { status: 'PUBLISHED', unlockHint: { not: null } },
  });
  const archived = await prisma.scene.count({ where: { status: 'ARCHIVED' } });
  console.log(`\n📊 PUBLISHED：${total}（锁定 ${locked}）· ARCHIVED：${archived}`);
  console.log('✅ 完成。内容管理端可继续增删改。');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
