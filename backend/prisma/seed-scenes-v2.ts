/**
 * 场景数据补全脚本 v2
 * 添加：7个一级地点 + 28个二级子场景
 * 更新：现有家庭子场景的 groupName → 'home'
 *       现有 school/hospital/park/mall 的 groupName → 对应英文 slug
 *       所有一级地点的 mapPosition 更新到新地图坐标（2400×2400 归一化）
 *
 * 运行：cd code/apps/api && npx tsx prisma/seed-scenes-v2.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BASE = 'http://localhost:3000/uploads';

// ── 一级地点（地图节点）──────────────────────────────────────────
// mapPosition: 百分比坐标，对应 2400×2400 地图
const L1_LOCATIONS = [
  {
    slug: 'loc-home',
    name: '我的家',
    groupName: 'loc-home',    // L1 marker slug, NOT sub-scene groupName
    description: '家是你最熟悉的科学实验室。厨房、客厅、浴室……每个角落都藏着一套科学原理。',
    iconKind: 'home',
    themeColor: 'sun',
    isDefault: true,
    mapPosition: { x: 50, y: 50 },
    sortOrder: 0,
  },
  {
    slug: 'school',
    name: '学校',
    groupName: 'school',
    description: '教室、实验室、操场——这里的每一处都是学科知识真正发生的地方。',
    iconKind: 'school',
    themeColor: 'ocean',
    mapPosition: { x: 77, y: 20 },
    sortOrder: 10,
  },
  {
    slug: 'hospital',
    name: '医院',
    groupName: 'hospital',
    description: 'X光、心跳监测、药物——医院是物理、化学与生命科学的交汇点。',
    iconKind: 'hospital',
    themeColor: 'coral',
    mapPosition: { x: 86, y: 53 },
    sortOrder: 20,
  },
  {
    slug: 'park',
    name: '公园',
    groupName: 'park',
    description: '风、光合作用、水的循环……公园是最大的户外自然科学课堂。',
    iconKind: 'park',
    themeColor: 'leaf',
    mapPosition: { x: 20, y: 18 },
    sortOrder: 30,
  },
  {
    slug: 'supermarket',
    name: '超市',
    groupName: 'supermarket',
    description: '冷冻、保鲜、称重、结账——超市里每个环节都有一段科学故事。',
    iconKind: 'supermarket',
    themeColor: 'sun',
    mapPosition: { x: 12, y: 53 },
    sortOrder: 40,
  },
  {
    slug: 'playground',
    name: '游乐场',
    groupName: 'playground',
    description: '过山车、摩天轮、旋转木马——刺激背后是力学与运动学的完美演示。',
    iconKind: 'playground',
    themeColor: 'berry',
    mapPosition: { x: 70, y: 81 },
    sortOrder: 50,
  },
  {
    slug: 'mall',
    name: '商场',
    groupName: 'mall',
    description: '扶梯、空调、电影放映——商场是最密集的应用科技体验空间。',
    iconKind: 'mall',
    themeColor: 'plum',
    mapPosition: { x: 30, y: 81 },
    sortOrder: 60,
  },
];

// ── 二级子场景（L2）────────────────────────────────────────────────
// groupName = 对应 L1 slug（前端按此字段过滤）
const L2_SCENES = [
  // ── 家 ──────────────────────────────────────────────────────────
  { slug: 'home-bedroom', name: '卧室', groupName: 'home', description: '空调、台灯、加湿器……卧室里的舒适来自一套精密的环境控制科学。', iconKind: 'room', themeColor: 'ocean', sortOrder: 3 },
  { slug: 'home-study', name: '书房', groupName: 'home', description: '电脑、打印机、台灯——书房是信息与光学技术最集中的家居空间。', iconKind: 'room', themeColor: 'plum', sortOrder: 4 },

  // ── 学校 ──────────────────────────────────────────────────────
  { slug: 'school-classroom', name: '教室', groupName: 'school', description: '黑板、投影仪、荧光灯……教室里每件设备都是一节物理课。', iconKind: 'room', themeColor: 'ocean', sortOrder: 0 },
  { slug: 'school-lab', name: '实验室', groupName: 'school', description: '酒精灯、烧杯、天平——动手验证的地方，每次实验都是一次科学闭环。', iconKind: 'room', themeColor: 'amber', sortOrder: 1 },
  { slug: 'school-playground', name: '操场', groupName: 'school', description: '跑步、投篮、滑轮组——操场把运动学、力学变成了真实的身体感受。', iconKind: 'room', themeColor: 'leaf', sortOrder: 2 },
  { slug: 'school-library', name: '图书馆', groupName: 'school', description: '纸张、油墨、荧光灯……安静的图书馆里隐藏着材料学与光学的故事。', iconKind: 'room', themeColor: 'plum', sortOrder: 3 },

  // ── 医院 ──────────────────────────────────────────────────────
  { slug: 'hospital-emergency', name: '急诊室', groupName: 'hospital', description: '心电图、除颤仪、输液架——急诊室是生命科学最紧张的应用现场。', iconKind: 'room', themeColor: 'coral', sortOrder: 0 },
  { slug: 'hospital-xray', name: 'X光室', groupName: 'hospital', description: 'X射线能穿透皮肤看见骨骼——这背后是电磁波与物质相互作用的量子故事。', iconKind: 'room', themeColor: 'ocean', sortOrder: 1 },
  { slug: 'hospital-pharmacy', name: '药房', groupName: 'hospital', description: '溶解、缓释、剂量——药房是化学与生物学最精密的零售现场。', iconKind: 'room', themeColor: 'leaf', sortOrder: 2 },
  { slug: 'hospital-waiting', name: '候诊室', groupName: 'hospital', description: '体温计、血压仪、消毒剂——等待区里每样东西都在做安静的物理或化学工作。', iconKind: 'room', themeColor: 'sun', sortOrder: 3 },

  // ── 公园 ──────────────────────────────────────────────────────
  { slug: 'park-lawn', name: '草坪', groupName: 'park', description: '光合作用、露水蒸发、草叶的绿……草坪是最大的户外化学实验台。', iconKind: 'room', themeColor: 'leaf', sortOrder: 0 },
  { slug: 'park-lake', name: '湖边', groupName: 'park', description: '水的浮力、折射、波纹……湖边把物理光学与水动力学变得触手可及。', iconKind: 'room', themeColor: 'ocean', sortOrder: 1 },
  { slug: 'park-flower', name: '花圃', groupName: 'park', description: '花色、花香、蜜蜂授粉——花圃里隐藏着色素化学与生态系统的精彩互动。', iconKind: 'room', themeColor: 'berry', sortOrder: 2 },
  { slug: 'park-equipment', name: '健身器材', groupName: 'park', description: '椭圆机、单杠、跷跷板——每一件器材都是一道力学应用题。', iconKind: 'room', themeColor: 'amber', sortOrder: 3 },

  // ── 超市 ──────────────────────────────────────────────────────
  { slug: 'super-fresh', name: '生鲜区', groupName: 'supermarket', description: '低温保鲜、喷雾加湿、颜色指示新鲜——生鲜区是食品科学的展示台。', iconKind: 'room', themeColor: 'leaf', sortOrder: 0 },
  { slug: 'super-frozen', name: '冷冻区', groupName: 'supermarket', description: '压缩机、制冷剂、相变储能——冷冻柜把热力学第二定律变成了日常温度。', iconKind: 'room', themeColor: 'ocean', sortOrder: 1 },
  { slug: 'super-drinks', name: '饮料区', groupName: 'supermarket', description: '碳酸、pH值、渗透压——货架上的每瓶饮料都是一瓶化学溶液。', iconKind: 'room', themeColor: 'sun', sortOrder: 2 },
  { slug: 'super-checkout', name: '收银台', groupName: 'supermarket', description: '条形码、激光扫描、电子秤——收银台是光学与精密测量的迷你舞台。', iconKind: 'room', themeColor: 'amber', sortOrder: 3 },

  // ── 游乐场 ──────────────────────────────────────────────────
  { slug: 'play-carousel', name: '旋转木马', groupName: 'playground', description: '匀速圆周运动、向心力、平衡——旋转木马让孩子亲身体验牛顿第二定律。', iconKind: 'room', themeColor: 'berry', sortOrder: 0 },
  { slug: 'play-coaster', name: '过山车', groupName: 'playground', description: '势能转化为动能、失重、g力——过山车是能量守恒定律最刺激的演示装置。', iconKind: 'room', themeColor: 'coral', sortOrder: 1 },
  { slug: 'play-seesaw', name: '跷跷板', groupName: 'playground', description: '杠杆原理、支点、力矩——小小跷跷板让阿基米德定律变得有趣。', iconKind: 'room', themeColor: 'sun', sortOrder: 2 },
  { slug: 'play-slides', name: '滑梯', groupName: 'playground', description: '摩擦力、重力分力、加速度——滑梯是最简单也最完整的斜面力学实验。', iconKind: 'room', themeColor: 'leaf', sortOrder: 3 },

  // ── 商场 ──────────────────────────────────────────────────
  { slug: 'mall-electronics', name: '电器店', groupName: 'mall', description: '展示区里的每件电器都有一段工作原理——电磁感应、半导体、超声波。', iconKind: 'room', themeColor: 'ocean', sortOrder: 0 },
  { slug: 'mall-food', name: '美食广场', groupName: 'mall', description: '明火烹饪、蒸汽、微波——美食广场汇聚了厨房科学的所有传热方式。', iconKind: 'room', themeColor: 'amber', sortOrder: 1 },
  { slug: 'mall-cinema', name: '电影院', groupName: 'mall', description: '投影、杜比音效、3D偏振光——电影院是光学与声学技术的顶级展演空间。', iconKind: 'room', themeColor: 'plum', sortOrder: 2 },
  { slug: 'mall-arcade', name: '游戏厅', groupName: 'mall', description: '传感器、LED阵列、电机控制——街机柜里藏着一整套电子工程学的知识。', iconKind: 'room', themeColor: 'coral', sortOrder: 3 },
];

async function main() {
  console.log('🏗  开始更新场景数据 v2…\n');

  // ── 1. 更新现有家庭子场景的 groupName → 'home' ─────────────────
  for (const slug of ['home-kitchen', 'home-living', 'home-bath']) {
    await prisma.scene.update({ where: { slug }, data: { groupName: 'home' } });
    console.log(`✔ 更新 groupName: ${slug} → home`);
  }

  // ── 2. upsert 所有一级地点 ────────────────────────────────────
  for (const loc of L1_LOCATIONS) {
    await prisma.scene.upsert({
      where: { slug: loc.slug },
      update: {
        name: loc.name,
        groupName: loc.groupName,
        description: loc.description,
        iconKind: loc.iconKind,
        themeColor: loc.themeColor,
        mapPosition: loc.mapPosition,
        sortOrder: loc.sortOrder,
        status: 'PUBLISHED',
      },
      create: {
        slug: loc.slug,
        name: loc.name,
        groupName: loc.groupName,
        description: loc.description,
        iconKind: loc.iconKind,
        themeColor: loc.themeColor,
        isDefault: (loc as any).isDefault ?? false,
        mapPosition: loc.mapPosition,
        sortOrder: loc.sortOrder,
        status: 'PUBLISHED',
      },
    });
    console.log(`✔ 一级地点: ${loc.name} (${loc.slug})`);
  }

  // ── 3. upsert 所有二级子场景 ─────────────────────────────────
  for (const sc of L2_SCENES) {
    await prisma.scene.upsert({
      where: { slug: sc.slug },
      update: {
        name: sc.name,
        groupName: sc.groupName,
        description: sc.description,
        iconKind: sc.iconKind,
        themeColor: sc.themeColor,
        sortOrder: sc.sortOrder,
        status: 'PUBLISHED',
      },
      create: {
        slug: sc.slug,
        name: sc.name,
        groupName: sc.groupName,
        description: sc.description ?? '',
        iconKind: sc.iconKind,
        themeColor: sc.themeColor,
        isDefault: false,
        sortOrder: sc.sortOrder,
        status: 'PUBLISHED',
      },
    });
    console.log(`  ✔ 子场景: [${sc.groupName}] ${sc.name}`);
  }

  console.log('\n✅ 场景数据补全完成！');

  // ── 统计 ──────────────────────────────────────────────────────
  const total = await prisma.scene.count({ where: { status: 'PUBLISHED' } });
  console.log(`📊 当前 PUBLISHED 场景总数: ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
