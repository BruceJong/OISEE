/**
 * Prisma Seed · 完整内容版
 *
 * 包含：
 *   1. 超管账号
 *   2. 7 个场景（家: 厨房/客厅/浴室, 校园: 学校, 户外: 公园, 城市: 医院/商场）
 *   3. 各场景物品（厨房 6 件、客厅 4 件）
 *   4. 13 个知识点
 *   5. 5 个实验
 *   6. 物品-知识点、物品-实验、实验-知识点关联
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const BASE = 'http://localhost:3000/uploads';

async function seedSystem() {
  const username = process.env.OISEE_SEED_SUPERADMIN_USERNAME ?? 'admin';
  const password = process.env.OISEE_SEED_SUPERADMIN_PASSWORD ?? 'admin123456';
  const passwordHash = await argon2.hash(password);

  const admin = await prisma.admin.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash, role: 'superadmin' },
  });
  console.log(`✔ 超管账号：${admin.username}`);
}

async function seedContent() {
  // ──────────────────────────────────────────────────────────
  // 场景
  // ──────────────────────────────────────────────────────────
  const kitchen = await prisma.scene.upsert({
    where: { slug: 'home-kitchen' },
    update: {
      coverUrl: `${BASE}/scenes/kitchen-cover.png`,
      sceneImageUrl: `${BASE}/scenes/kitchen-scene.png`,
      status: 'PUBLISHED',
    },
    create: {
      slug: 'home-kitchen',
      name: '厨房',
      groupName: '家',
      description: '家里科学密度最高的地方——加热、制冷、燃烧、压力都在这里发生。',
      coverUrl: `${BASE}/scenes/kitchen-cover.png`,
      sceneImageUrl: `${BASE}/scenes/kitchen-scene.png`,
      iconKind: 'home',
      themeColor: 'sun',
      isDefault: true,
      mapPosition: { x: 28, y: 56 },
      status: 'PUBLISHED',
      sortOrder: 0,
    },
  });

  const living = await prisma.scene.upsert({
    where: { slug: 'home-living' },
    update: {
      coverUrl: `${BASE}/scenes/living-cover.png`,
      sceneImageUrl: `${BASE}/scenes/living-scene.png`,
      status: 'PUBLISHED',
    },
    create: {
      slug: 'home-living',
      name: '客厅',
      groupName: '家',
      description: '电器最集中的房间，电视、空调、音响各有各的科学。',
      coverUrl: `${BASE}/scenes/living-cover.png`,
      sceneImageUrl: `${BASE}/scenes/living-scene.png`,
      iconKind: 'home',
      themeColor: 'leaf',
      isDefault: false,
      mapPosition: { x: 16, y: 30 },
      status: 'PUBLISHED',
      sortOrder: 1,
    },
  });

  const bathroom = await prisma.scene.upsert({
    where: { slug: 'home-bath' },
    update: {
      coverUrl: `${BASE}/scenes/bathroom-cover.png`,
      status: 'PUBLISHED',
    },
    create: {
      slug: 'home-bath',
      name: '浴室',
      groupName: '家',
      description: '水、温度、压强在这里相遇，每天都在发生的科学。',
      coverUrl: `${BASE}/scenes/bathroom-cover.png`,
      iconKind: 'home',
      themeColor: 'ocean',
      isDefault: false,
      mapPosition: { x: 42, y: 22 },
      status: 'PUBLISHED',
      sortOrder: 2,
    },
  });

  const school = await prisma.scene.upsert({
    where: { slug: 'school' },
    update: {
      coverUrl: `${BASE}/scenes/school-cover.png`,
      status: 'PUBLISHED',
    },
    create: {
      slug: 'school',
      name: '学校',
      groupName: '校园',
      description: '实验室、操场、教室——学校里处处是科学的舞台。',
      coverUrl: `${BASE}/scenes/school-cover.png`,
      iconKind: 'school',
      themeColor: 'coral',
      isDefault: false,
      unlockHint: '完成厨房 80% 探索度',
      mapPosition: { x: 62, y: 40 },
      status: 'PUBLISHED',
      sortOrder: 3,
    },
  });

  const park = await prisma.scene.upsert({
    where: { slug: 'park' },
    update: {
      coverUrl: `${BASE}/scenes/park-cover.png`,
      status: 'PUBLISHED',
    },
    create: {
      slug: 'park',
      name: '公园',
      groupName: '户外',
      description: '植物、昆虫、阳光、风……自然界最好的科学课堂。',
      coverUrl: `${BASE}/scenes/park-cover.png`,
      iconKind: 'park',
      themeColor: 'leaf',
      isDefault: false,
      unlockHint: '解锁学校后开放',
      mapPosition: { x: 78, y: 64 },
      status: 'PUBLISHED',
      sortOrder: 4,
    },
  });

  const hospital = await prisma.scene.upsert({
    where: { slug: 'hospital' },
    update: {
      coverUrl: `${BASE}/scenes/hospital-cover.png`,
      status: 'PUBLISHED',
    },
    create: {
      slug: 'hospital',
      name: '医院',
      groupName: '城市',
      description: 'X 光、血压计、体温计——医院里的科学仪器最精密。',
      coverUrl: `${BASE}/scenes/hospital-cover.png`,
      iconKind: 'hospital',
      themeColor: 'berry',
      isDefault: false,
      unlockHint: '完成 3 个学科勋章',
      mapPosition: { x: 85, y: 26 },
      status: 'PUBLISHED',
      sortOrder: 5,
    },
  });

  const mall = await prisma.scene.upsert({
    where: { slug: 'mall' },
    update: {
      coverUrl: `${BASE}/scenes/mall-cover.png`,
      status: 'PUBLISHED',
    },
    create: {
      slug: 'mall',
      name: '商场',
      groupName: '城市',
      description: '自动扶梯、空调、灯光……商场是工程学的展示厅。',
      coverUrl: `${BASE}/scenes/mall-cover.png`,
      iconKind: 'mall',
      themeColor: 'sun',
      isDefault: false,
      unlockHint: '累计积分达到 800',
      mapPosition: { x: 55, y: 72 },
      status: 'PUBLISHED',
      sortOrder: 6,
    },
  });

  console.log('✔ 7 个场景');

  // ──────────────────────────────────────────────────────────
  // 知识点（先建，物品-知识点后关联）
  // ──────────────────────────────────────────────────────────
  const kpEmWave = await prisma.knowledgePoint.upsert({
    where: { slug: 'em-wave' },
    update: { illustrationUrl: `${BASE}/knowledge/em-wave.png` },
    create: {
      slug: 'em-wave',
      name: '电磁波是什么',
      subject: 'PHYSICS',
      difficulty: 'L1',
      summary: '看不见的能量波，无线电、光和微波都是它',
      content: `电磁波是由电场和磁场交替变化形成的波动，它不需要任何介质就能在真空中传播。

你每天能用到的东西——手机信号、Wi-Fi、电视遥控器、太阳光、微波炉的"波"——都是电磁波，只是频率不同。

**频率越高，波长越短，能量越大。**
- 无线电波（手机信号）：频率最低，穿透力强
- 微波（微波炉）：2.45GHz，能使水分子振动
- 可见光（我们能看见的）：频率中等
- X射线（医院拍片）：频率高，穿透力强`,
      illustrationUrl: `${BASE}/knowledge/em-wave.png`,
      status: 'PUBLISHED',
    },
  });

  const kpWaterMolecule = await prisma.knowledgePoint.upsert({
    where: { slug: 'water-molecule' },
    update: { illustrationUrl: `${BASE}/knowledge/water-molecule.png` },
    create: {
      slug: 'water-molecule',
      name: '水分子的振动',
      subject: 'PHYSICS',
      difficulty: 'L2',
      summary: '微波让水分子来回振动，分子摩擦产生热量',
      content: `水分子（H₂O）是一个有"正负两端"的**极性分子**。

当微波（电磁波的一种）穿过水时，电场方向每秒变化数十亿次，水分子也被迫跟着翻转。

分子之间相互摩擦，把动能转化为热能——这就是微波炉加热食物的原理。

> 这就是为什么含水量多的食物，比如蔬菜，比含水量少的食物加热得更快。`,
      illustrationUrl: `${BASE}/knowledge/water-molecule.png`,
      status: 'PUBLISHED',
    },
  });

  const kpDielectric = await prisma.knowledgePoint.upsert({
    where: { slug: 'dielectric-heating' },
    update: {},
    create: {
      slug: 'dielectric-heating',
      name: '介电加热',
      subject: 'PHYSICS',
      difficulty: 'L3',
      summary: '2.45GHz 微波让水的极性分子取向反复变化，能量耗散为热',
      content: `介电加热（Dielectric Heating）是利用高频电磁场使极性材料内部分子反复取向运动，通过分子间摩擦产生热量的加热方式。

**微波炉的工作频率是 2.45GHz**，这个频率经过精心选择：
- 足够高，让水分子快速旋转
- 不要太高，否则只加热表面而非内部
- 与 Wi-Fi 的 2.4GHz 非常接近（这就是为什么微波炉工作时可能干扰 Wi-Fi）

热量产生效率由材料的**介电损耗角正切（tan δ）**决定。`,
      status: 'PUBLISHED',
    },
  });

  const kpHeatTransfer = await prisma.knowledgePoint.upsert({
    where: { slug: 'heat-transfer' },
    update: { illustrationUrl: `${BASE}/knowledge/heat-transfer.png` },
    create: {
      slug: 'heat-transfer',
      name: '热的传递',
      subject: 'PHYSICS',
      difficulty: 'L1',
      summary: '热会从温度高的地方流向温度低的地方',
      content: `热量总是从**高温物体**传向**低温物体**，直到两者温度相等（热平衡）。

传递方式有三种：
1. **热传导**：通过物体内部分子碰撞传热（如用手摸热锅）
2. **热对流**：通过流体（液体或气体）流动传热（如烧水时热水上升）
3. **热辐射**：通过电磁波传热，不需要介质（如太阳晒暖我们）

冰箱就是**阻止热传递**的机器——它用隔热层减少外界热量传入，同时用压缩机把内部热量"搬出去"。`,
      illustrationUrl: `${BASE}/knowledge/heat-transfer.png`,
      status: 'PUBLISHED',
    },
  });

  const kpCompressor = await prisma.knowledgePoint.upsert({
    where: { slug: 'compressor' },
    update: { illustrationUrl: `${BASE}/knowledge/compressor.png` },
    create: {
      slug: 'compressor',
      name: '压缩机的秘密',
      subject: 'PHYSICS',
      difficulty: 'L2',
      summary: '通过压缩气体可以把热「搬运」到别的地方',
      content: `压缩机是冰箱和空调的心脏，它利用一个巧妙的原理：**气体被压缩时温度升高，膨胀时温度降低**。

冷藏循环：
1. 制冷剂液体进入冰箱内的**蒸发器**，吸收冰箱里的热量，变成气体（吸热）
2. 气态制冷剂被**压缩机**压缩，温度升高
3. 高温气态制冷剂在冰箱背面的**冷凝器**散热，变回液体（放热）
4. 液态制冷剂再次进入蒸发器，循环继续

这就是为什么冰箱背面会发热——它正在把冰箱里的热量"搬"出来。`,
      illustrationUrl: `${BASE}/knowledge/compressor.png`,
      status: 'PUBLISHED',
    },
  });

  const kpPhaseChange = await prisma.knowledgePoint.upsert({
    where: { slug: 'phase-change' },
    update: { illustrationUrl: `${BASE}/knowledge/phase-change.png` },
    create: {
      slug: 'phase-change',
      name: '物态变化',
      subject: 'CHEMISTRY',
      difficulty: 'L2',
      summary: '冰融化、水沸腾，是分子排列方式的转换',
      content: `物质有三种常见状态：固态、液态、气态。状态之间的转变叫做**物态变化**。

- 固→液：熔化（吸热）
- 液→气：汽化，包括蒸发和沸腾（吸热）
- 气→液：液化（放热）
- 液→固：凝固（放热）
- 固→气：升华（吸热），如樟脑球慢慢消失

**汽化吸热**是我们用来降温的原理：汗水蒸发带走皮肤热量；冰箱里的制冷剂汽化吸收食物热量。`,
      illustrationUrl: `${BASE}/knowledge/phase-change.png`,
      status: 'PUBLISHED',
    },
  });

  const kpResistance = await prisma.knowledgePoint.upsert({
    where: { slug: 'resistance-heat' },
    update: { illustrationUrl: `${BASE}/knowledge/resistance-heat.png` },
    create: {
      slug: 'resistance-heat',
      name: '电流做功生热',
      subject: 'PHYSICS',
      difficulty: 'L1',
      summary: '电流穿过电阻就会发热——焦耳定律',
      content: `电流通过有电阻的物体时，电能会转化为热能。这就是**焦耳定律**：

> **Q = I²Rt**
>
> Q = 产生的热量（焦耳）
> I = 电流强度（安培）
> R = 电阻（欧姆）
> t = 通电时间（秒）

**应用**：电热水壶、电饭煲、电吹风、电暖气……都是利用这个原理。

加热丝材料通常选用**镍铬合金**，因为它的电阻率高、耐高温、不易氧化。`,
      illustrationUrl: `${BASE}/knowledge/resistance-heat.png`,
      status: 'PUBLISHED',
    },
  });

  const kpBoilingPoint = await prisma.knowledgePoint.upsert({
    where: { slug: 'boiling-point' },
    update: { illustrationUrl: `${BASE}/knowledge/boiling-point.png` },
    create: {
      slug: 'boiling-point',
      name: '沸点',
      subject: 'PHYSICS',
      difficulty: 'L1',
      summary: '水到 100℃ 就开始沸腾啦',
      content: `沸点是液体开始沸腾（大量汽化）时的温度。

**水在标准大气压下的沸点是 100℃。**

但沸点会随**气压**改变：
- 气压越高，沸点越高（高压锅原理：内部气压达 1.5 倍大气压，水在 120℃ 才沸腾，食物熟得更快）
- 气压越低，沸点越低（高山上水 90℃ 就沸腾，饭煮不熟）

> 珠穆朗玛峰顶（8848m），大气压约 0.33 atm，水约 70℃ 沸腾。`,
      illustrationUrl: `${BASE}/knowledge/boiling-point.png`,
      status: 'PUBLISHED',
    },
  });

  const kpCombustion = await prisma.knowledgePoint.upsert({
    where: { slug: 'combustion' },
    update: { illustrationUrl: `${BASE}/knowledge/combustion.png` },
    create: {
      slug: 'combustion',
      name: '燃烧反应',
      subject: 'CHEMISTRY',
      difficulty: 'L1',
      summary: '燃料 + 氧气 → 二氧化碳 + 水 + 热',
      content: `燃烧是物质与氧气发生的**快速氧化反应**，同时释放大量热和光。

天然气（主要成分甲烷 CH₄）在灶头燃烧：
> **CH₄ + 2O₂ → CO₂ + 2H₂O + 热**

**充分燃烧 vs 不充分燃烧**：
- 充分燃烧：氧气充足，产生蓝色火焰，完全转化为 CO₂ 和 H₂O，热量释放多
- 不充分燃烧：氧气不足，产生黄色/橙色火焰，生成有毒的 CO（一氧化碳），释放热量少

这就是燃气灶要保持通风的原因。`,
      illustrationUrl: `${BASE}/knowledge/combustion.png`,
      status: 'PUBLISHED',
    },
  });

  const kpBlueFlame = await prisma.knowledgePoint.upsert({
    where: { slug: 'blue-flame' },
    update: {},
    create: {
      slug: 'blue-flame',
      name: '为什么是蓝色火焰',
      subject: 'CHEMISTRY',
      difficulty: 'L2',
      summary: '充分燃烧时温度更高，发出蓝光',
      content: `火焰颜色与**燃烧温度**和**燃烧完全程度**有关。

- **黄色/橙色火焰**：温度相对较低（约 1000℃），碳粒子燃烧不充分，发出黄光
- **蓝色火焰**：温度高（约 1500-2000℃），完全燃烧，CO 和 CH 激发态分子发出蓝光

燃气灶的蓝色火焰说明天然气在充足空气下充分燃烧，能量利用率高。`,
      status: 'PUBLISHED',
    },
  });

  const kpPressure = await prisma.knowledgePoint.upsert({
    where: { slug: 'pressure' },
    update: { illustrationUrl: `${BASE}/knowledge/pressure.png` },
    create: {
      slug: 'pressure',
      name: '压强',
      subject: 'PHYSICS',
      difficulty: 'L2',
      summary: '同样的力作用在更小面积上，压强更大',
      content: `**压强 = 压力 ÷ 受力面积**（P = F/A）

当同样大小的力作用在不同面积上时：
- 面积越小，压强越大
- 菜刀的刀刃磨得很薄，就是为了减小接触面积，让压强变大，切东西更容易
- 图钉尖端面积极小，可以轻松扎入木板

**单位**：帕斯卡（Pa），1 Pa = 1 N/m²

> 标准大气压约为 101325 Pa，相当于 1 平方厘米面积上承受约 1 公斤的重量。`,
      illustrationUrl: `${BASE}/knowledge/pressure.png`,
      status: 'PUBLISHED',
    },
  });

  const kpAirflow = await prisma.knowledgePoint.upsert({
    where: { slug: 'airflow' },
    update: {},
    create: {
      slug: 'airflow',
      name: '气流',
      subject: 'PHYSICS',
      difficulty: 'L1',
      summary: '空气和水一样会流动',
      content: `空气是有质量、有重量的物质，它会像水一样流动。

**气流产生的原因**：温度差和气压差会驱动空气流动。热空气密度小、向上运动；冷空气密度大、向下运动，形成对流。

**抽油烟机利用气流**：电机带动风扇高速旋转，产生负压（低气压区域），将厨房油烟吸入管道排出室外。`,
      status: 'PUBLISHED',
    },
  });

  const kpBernoulli = await prisma.knowledgePoint.upsert({
    where: { slug: 'bernoulli' },
    update: { illustrationUrl: `${BASE}/knowledge/bernoulli.png` },
    create: {
      slug: 'bernoulli',
      name: '伯努利原理',
      subject: 'PHYSICS',
      difficulty: 'L3',
      summary: '流速越快的地方，压强越小',
      content: `伯努利原理：在流体（液体或气体）中，**流速越大的地方压强越小**，流速越小的地方压强越大。

数学表达：**P + ½ρv² + ρgh = 常数**

**生活中的应用**：
- 飞机升力：机翼上方弧度大、气流快、气压低；下方气流慢、气压高，产生向上的升力
- 雾化喷壶：高速气流经过细管口，产生低压，将液体吸出雾化
- 抽油烟机：高速风扇造成低压区，吸走油烟

> 这也解释了为什么高速行驶的两辆车不能离太近——中间空气流速快、气压低，会产生相互吸引的力。`,
      illustrationUrl: `${BASE}/knowledge/bernoulli.png`,
      status: 'PUBLISHED',
    },
  });

  console.log('✔ 13 个知识点');

  // ──────────────────────────────────────────────────────────
  // 物品（厨房）
  // ──────────────────────────────────────────────────────────
  const microwave = await prisma.item.upsert({
    where: { slug: 'microwave' },
    update: {
      itemImageUrl: `${BASE}/items/microwave.png`,
      explodedImageUrl: `${BASE}/items/microwave-exploded.png`,
    },
    create: {
      slug: 'microwave',
      name: '微波炉',
      sceneId: kitchen.id,
      coverUrl: `${BASE}/items/microwave.png`,
      itemImageUrl: `${BASE}/items/microwave.png`,
      shortDesc: '发出看不见的「波」让食物变热',
      principleByLevel: {
        L1: '微波炉发出看不见的「波」让食物里的水动起来变热。',
        L2: '电磁波使水分子来回振动，分子间摩擦产生热量。',
        L3: '2.45GHz 微波驱动极性分子取向反复变化，介电损耗转化为热。',
      },
      videoTitle: '微波炉是怎么把食物加热的？',
      videoDurationSec: 222,
      explodedImageUrl: `${BASE}/items/microwave-exploded.png`,
      parts: [
        { no: 1, name: '磁控管', desc: '产生 2.45GHz 微波的关键元件，本质是一个电子振荡器', x: 30, y: 30 },
        { no: 2, name: '波导管', desc: '把微波从磁控管引导到加热腔内', x: 50, y: 25 },
        { no: 3, name: '加热腔体', desc: '微波在这里来回反射，均匀加热食物', x: 60, y: 55 },
        { no: 4, name: '玻璃转盘', desc: '让食物慢慢旋转，使微波照射更均匀', x: 55, y: 75 },
        { no: 5, name: '控制面板', desc: '设置加热时间和功率', x: 82, y: 50 },
      ],
      scenePosition: { x: 50, y: 38, width: 12, height: 14 },
      status: 'PUBLISHED',
      sortOrder: 0,
    },
  });

  const fridge = await prisma.item.upsert({
    where: { slug: 'fridge' },
    update: {
      itemImageUrl: `${BASE}/items/fridge.png`,
      explodedImageUrl: `${BASE}/items/fridge-exploded.png`,
    },
    create: {
      slug: 'fridge',
      name: '冰箱',
      sceneId: kitchen.id,
      itemImageUrl: `${BASE}/items/fridge.png`,
      shortDesc: '把热量「搬走」让里面变冷',
      principleByLevel: {
        L1: '冰箱把里面的热量「搬」到外面去，所以里面变冷。',
        L2: '压缩机循环压缩制冷剂，利用相变吸收热量。',
        L3: '逆卡诺循环：制冷剂在蒸发器吸热气化，冷凝器放热液化。',
      },
      videoTitle: '冰箱是怎么制冷的？',
      videoDurationSec: 198,
      explodedImageUrl: `${BASE}/items/fridge-exploded.png`,
      parts: [
        { no: 1, name: '压缩机', desc: '冰箱的心脏，压缩制冷剂气体使其升温', x: 20, y: 80 },
        { no: 2, name: '冷凝器', desc: '位于冰箱背面或底部，释放热量', x: 15, y: 65 },
        { no: 3, name: '蒸发器', desc: '位于冰箱内壁，吸收热量制冷', x: 50, y: 30 },
        { no: 4, name: '冷藏室', desc: '保持 2-8℃，适合蔬菜水果', x: 55, y: 45 },
        { no: 5, name: '冷冻室', desc: '保持 -18℃，用于冷冻保存', x: 55, y: 20 },
      ],
      scenePosition: { x: 14, y: 30, width: 14, height: 18 },
      status: 'PUBLISHED',
      sortOrder: 1,
    },
  });

  const kettle = await prisma.item.upsert({
    where: { slug: 'kettle' },
    update: { itemImageUrl: `${BASE}/items/kettle.png` },
    create: {
      slug: 'kettle',
      name: '电热水壶',
      sceneId: kitchen.id,
      itemImageUrl: `${BASE}/items/kettle.png`,
      shortDesc: '电流穿过电阻产生热',
      principleByLevel: {
        L1: '电流流过加热丝，加热丝就变热，把水煮开。',
        L2: '电流做功转化为热量（焦耳定律 Q=I²Rt）。',
        L3: '电阻发热效率取决于材料的电阻率与几何结构。',
      },
      videoTitle: '电水壶是怎么烧水的？',
      videoDurationSec: 165,
      parts: [
        { no: 1, name: '加热盘（电热管）', desc: '不锈钢管内的镍铬合金丝，通电发热', x: 50, y: 75 },
        { no: 2, name: '水位指示窗', desc: '透明窗口，方便观察水量', x: 90, y: 55 },
        { no: 3, name: '自动断电装置', desc: '水沸腾时蒸汽触发双金属片弯曲断电', x: 50, y: 20 },
        { no: 4, name: '底座（电源接头）', desc: '360° 旋转接头，方便拿取', x: 50, y: 95 },
      ],
      scenePosition: { x: 84, y: 50, width: 10, height: 12 },
      status: 'PUBLISHED',
      sortOrder: 2,
    },
  });

  const stove = await prisma.item.upsert({
    where: { slug: 'stove' },
    update: { itemImageUrl: `${BASE}/items/stove.png` },
    create: {
      slug: 'stove',
      name: '燃气灶',
      sceneId: kitchen.id,
      itemImageUrl: `${BASE}/items/stove.png`,
      shortDesc: '可控的化学燃烧反应',
      principleByLevel: {
        L1: '天然气和空气混合点燃，就会持续燃烧，放出热量。',
        L2: '甲烷与氧气发生氧化反应，生成 CO₂ 和 H₂O，同时释放热量。',
        L3: '预混燃烧：一次空气与燃气混合比例控制充分燃烧，蓝色火焰温度达 1800℃。',
      },
      videoTitle: '燃气灶的蓝色火焰从哪里来？',
      videoDurationSec: 180,
      scenePosition: { x: 44, y: 70, width: 16, height: 12 },
      status: 'PUBLISHED',
      sortOrder: 3,
    },
  });

  const knife = await prisma.item.upsert({
    where: { slug: 'knife' },
    update: { itemImageUrl: `${BASE}/items/knife.png` },
    create: {
      slug: 'knife',
      name: '菜刀',
      sceneId: kitchen.id,
      itemImageUrl: `${BASE}/items/knife.png`,
      shortDesc: '压强：小面积带来大压力',
      principleByLevel: {
        L1: '刀刃很薄，同样的力作用在更小面积上，所以切得开。',
        L2: '压强 = 力 ÷ 面积，刀刃面积小，压强大，切断食物。',
        L3: '刀刃的锋利程度（曲率）决定切断时的应力集中程度。',
      },
      scenePosition: { x: 32, y: 80, width: 10, height: 8 },
      status: 'PUBLISHED',
      sortOrder: 4,
    },
  });

  const hood = await prisma.item.upsert({
    where: { slug: 'range-hood' },
    update: { itemImageUrl: `${BASE}/items/hood.png` },
    create: {
      slug: 'range-hood',
      name: '抽油烟机',
      sceneId: kitchen.id,
      itemImageUrl: `${BASE}/items/hood.png`,
      shortDesc: '空气流动带走油烟',
      principleByLevel: {
        L1: '电机带动风扇，风扇转动产生吸力，把油烟抽走。',
        L2: '风扇旋转产生负压区，油烟气流从低压区流向高压区被排出。',
        L3: '离心风机的流体力学：叶轮旋转使气体获得动能，经蜗壳将动能转化为压差。',
      },
      scenePosition: { x: 64, y: 18, width: 16, height: 8 },
      status: 'PUBLISHED',
      sortOrder: 5,
    },
  });

  console.log('✔ 6 件厨房物品');

  // 客厅物品
  const tv = await prisma.item.upsert({
    where: { slug: 'tv' },
    update: { itemImageUrl: `${BASE}/items/tv.png` },
    create: {
      slug: 'tv',
      name: '电视机',
      sceneId: living.id,
      itemImageUrl: `${BASE}/items/tv.png`,
      shortDesc: '把电信号变成你能看见的图像',
      principleByLevel: {
        L1: '电视机接收信号，让屏幕上的小点发光，组成画面。',
        L2: '液晶屏通过控制液晶分子的偏转来控制背光通过量，产生画面。',
        L3: 'TFT-LCD 每个像素由薄膜晶体管独立控制，OLED 像素自发光。',
      },
      scenePosition: { x: 50, y: 20, width: 22, height: 14 },
      status: 'PUBLISHED',
      sortOrder: 0,
    },
  });

  console.log('✔ 客厅物品');

  // ──────────────────────────────────────────────────────────
  // 物品-知识点关联
  // ──────────────────────────────────────────────────────────
  await prisma.itemKnowledgePoint.createMany({
    data: [
      { itemId: microwave.id, knowledgePointId: kpEmWave.id, sortOrder: 0 },
      { itemId: microwave.id, knowledgePointId: kpWaterMolecule.id, sortOrder: 1 },
      { itemId: microwave.id, knowledgePointId: kpDielectric.id, sortOrder: 2 },
      { itemId: fridge.id, knowledgePointId: kpHeatTransfer.id, sortOrder: 0 },
      { itemId: fridge.id, knowledgePointId: kpCompressor.id, sortOrder: 1 },
      { itemId: fridge.id, knowledgePointId: kpPhaseChange.id, sortOrder: 2 },
      { itemId: kettle.id, knowledgePointId: kpResistance.id, sortOrder: 0 },
      { itemId: kettle.id, knowledgePointId: kpBoilingPoint.id, sortOrder: 1 },
      { itemId: kettle.id, knowledgePointId: kpHeatTransfer.id, sortOrder: 2 },
      { itemId: stove.id, knowledgePointId: kpCombustion.id, sortOrder: 0 },
      { itemId: stove.id, knowledgePointId: kpBlueFlame.id, sortOrder: 1 },
      { itemId: knife.id, knowledgePointId: kpPressure.id, sortOrder: 0 },
      { itemId: hood.id, knowledgePointId: kpAirflow.id, sortOrder: 0 },
      { itemId: hood.id, knowledgePointId: kpBernoulli.id, sortOrder: 1 },
      { itemId: kettle.id, knowledgePointId: kpPhaseChange.id, sortOrder: 3 },
    ],
    skipDuplicates: true,
  });
  console.log('✔ 物品-知识点关联');

  // 知识网络关系
  await prisma.knowledgeRelation.createMany({
    data: [
      { fromId: kpEmWave.id, toId: kpWaterMolecule.id },
      { fromId: kpWaterMolecule.id, toId: kpDielectric.id },
      { fromId: kpHeatTransfer.id, toId: kpCompressor.id },
      { fromId: kpHeatTransfer.id, toId: kpPhaseChange.id },
      { fromId: kpCompressor.id, toId: kpPhaseChange.id },
      { fromId: kpResistance.id, toId: kpHeatTransfer.id },
      { fromId: kpBoilingPoint.id, toId: kpPhaseChange.id },
      { fromId: kpCombustion.id, toId: kpBlueFlame.id },
      { fromId: kpAirflow.id, toId: kpBernoulli.id },
      { fromId: kpPressure.id, toId: kpBernoulli.id },
    ],
    skipDuplicates: true,
  });
  console.log('✔ 知识网络关系');

  // ──────────────────────────────────────────────────────────
  // 实验
  // ──────────────────────────────────────────────────────────
  const expMarshmallow = await prisma.experiment.upsert({
    where: { slug: 'exp-marshmallow' },
    update: { coverUrl: `${BASE}/experiments/marshmallow.png` },
    create: {
      slug: 'exp-marshmallow',
      name: '微波炉里的棉花糖巨人',
      difficulty: 'L1',
      durationMin: 10,
      needParent: true,
      materialType: '家用物品',
      description: '把棉花糖放进微波炉，看它「长大」十倍！理解微波加热让气泡膨胀的过程。棉花糖里有大量微小气泡，微波加热使气泡里的空气膨胀，棉花糖就像被吹大的气球。',
      materialsHome: ['棉花糖 1 颗', '微波炉适用盘子', '微波炉'],
      materialsKit: [],
      safety: '全程需家长陪同，加热时间不超过 30 秒，取出后小心高温',
      coverUrl: `${BASE}/experiments/marshmallow.png`,
      status: 'PUBLISHED',
      sortOrder: 0,
    },
  });

  const expIceSalt = await prisma.experiment.upsert({
    where: { slug: 'exp-ice-salt' },
    update: { coverUrl: `${BASE}/experiments/ice-salt.png` },
    create: {
      slug: 'exp-ice-salt',
      name: '冰盐魔法：让水结冰',
      difficulty: 'L2',
      durationMin: 20,
      needParent: false,
      materialType: '材料包',
      description: '在冰里加盐，温度会降到 0℃ 以下！把瓶子里的水变成冰沙。食盐溶于水会降低水的冰点（凝固点降低），所以含盐的冰水混合物可以达到 -20℃。',
      materialsHome: ['塑料瓶装水', '冰块'],
      materialsKit: ['实验盐（粗）100g', '温度计', '搅拌棒', '实验手套'],
      safety: '戴手套防止冻伤，不要接触眼睛',
      coverUrl: `${BASE}/experiments/ice-salt.png`,
      status: 'PUBLISHED',
      sortOrder: 1,
    },
  });

  const expGramaPlasma = await prisma.experiment.upsert({
    where: { slug: 'exp-grape-plasma' },
    update: { coverUrl: `${BASE}/experiments/grape-plasma.png` },
    create: {
      slug: 'exp-grape-plasma',
      name: '葡萄等离子体',
      difficulty: 'L3',
      durationMin: 5,
      needParent: true,
      materialType: '家用物品',
      description: '切开的葡萄在微波炉中能产生肉眼可见的等离子体火花！葡萄含大量水分和电解质，切口形成细小导电桥，微波在此处形成电场集中，激发等离子体。',
      materialsHome: ['葡萄 1 颗', '陶瓷盘', '微波炉'],
      materialsKit: [],
      safety: '⚠️ 高级实验，必须家长陪同，时间严格控制在 5 秒内，超时可能损坏微波炉',
      coverUrl: `${BASE}/experiments/grape-plasma.png`,
      status: 'PUBLISHED',
      sortOrder: 2,
    },
  });

  const expCandleCover = await prisma.experiment.upsert({
    where: { slug: 'exp-candle-cover' },
    update: { coverUrl: `${BASE}/experiments/candle-cover.png` },
    create: {
      slug: 'exp-candle-cover',
      name: '蜡烛与杯子',
      difficulty: 'L1',
      durationMin: 8,
      needParent: true,
      materialType: '家用物品',
      description: '用透明杯子盖住燃烧的蜡烛，观察火焰逐渐熄灭。蜡烛燃烧需要氧气，杯子密封后氧气耗尽，火焰自然熄灭，同时杯子内气压降低，水会被吸进去。',
      materialsHome: ['蜡烛', '玻璃杯', '打火机', '浅碟子（盛水）'],
      materialsKit: [],
      safety: '家长负责点火，保持通风，远离易燃物',
      coverUrl: `${BASE}/experiments/candle-cover.png`,
      status: 'PUBLISHED',
      sortOrder: 3,
    },
  });

  const expPaperAirplane = await prisma.experiment.upsert({
    where: { slug: 'exp-paper-airplane' },
    update: { coverUrl: `${BASE}/experiments/paper-airplane.png` },
    create: {
      slug: 'exp-paper-airplane',
      name: '纸飞机翼型大测试',
      difficulty: 'L2',
      durationMin: 30,
      needParent: false,
      materialType: '家用物品',
      description: '做 3 种不同翼型的纸飞机，比比谁飞得最远！翼型的形状影响气流分布，不同翼型产生不同的升力和阻力比，决定飞行距离。',
      materialsHome: ['A4 纸 3 张', '尺子', '胶带', '记录本'],
      materialsKit: [],
      safety: '在空旷地方测试，不要朝人飞',
      coverUrl: `${BASE}/experiments/paper-airplane.png`,
      status: 'PUBLISHED',
      sortOrder: 4,
    },
  });

  console.log('✔ 5 个实验');

  // 实验-物品关联
  await prisma.experimentItem.createMany({
    data: [
      { experimentId: expMarshmallow.id, itemId: microwave.id },
      { experimentId: expGramaPlasma.id, itemId: microwave.id },
      { experimentId: expIceSalt.id, itemId: fridge.id },
      { experimentId: expCandleCover.id, itemId: stove.id },
      { experimentId: expPaperAirplane.id, itemId: hood.id },
    ],
    skipDuplicates: true,
  });

  // 实验-知识点关联
  await prisma.experimentKnowledgePoint.createMany({
    data: [
      { experimentId: expMarshmallow.id, knowledgePointId: kpEmWave.id },
      { experimentId: expGramaPlasma.id, knowledgePointId: kpEmWave.id },
      { experimentId: expGramaPlasma.id, knowledgePointId: kpDielectric.id },
      { experimentId: expIceSalt.id, knowledgePointId: kpHeatTransfer.id },
      { experimentId: expIceSalt.id, knowledgePointId: kpPhaseChange.id },
      { experimentId: expCandleCover.id, knowledgePointId: kpCombustion.id },
      { experimentId: expPaperAirplane.id, knowledgePointId: kpAirflow.id },
      { experimentId: expPaperAirplane.id, knowledgePointId: kpBernoulli.id },
    ],
    skipDuplicates: true,
  });
  console.log('✔ 实验关联');
}

async function main() {
  console.log('🌱 开始 seed...');
  await seedSystem();
  if (process.env.OISEE_NODE_ENV !== 'production') {
    console.log('🌱 灌入完整内容数据...');
    await seedContent();
  }
  console.log('✅ Seed 完成');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
