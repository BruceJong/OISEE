/**
 * 物品 + 知识点 冷启动数据 v1
 *
 * 范围：所有 42 个 L2 场景 × 每场景 ≥5 个物品 × 每物品 ≥3 个知识点
 * 策略：
 *   - L2 已存在的物品（kitchen 6 个、living 1 个）不动；为 home-living 补足至 5 个
 *   - 其他 40 个 L2 场景各创建 5 个新物品
 *   - 物品上挂载 3 个 KP（可复用现有 KP，slug 冲突时跳过创建）
 *   - 每个物品给一个 scenePosition（百分比），用于在 2.5D 场景图上标点
 *
 * 运行：cd code/apps/api && npx tsx prisma/seed-items-v1.ts
 */
import { PrismaClient, Subject, Difficulty } from '@prisma/client';

const prisma = new PrismaClient();

/* ────────────────────────────────────────────────────────────────
   类型定义
──────────────────────────────────────────────────────────────── */
type KP = {
  slug: string;
  name: string;
  subject: Subject;
  difficulty: Difficulty;
  summary: string;
};
type ItemDef = {
  slug: string;
  name: string;
  shortDesc: string;
  /** 物品在 2.5D 场景图上的相对位置 (x,y 百分比 0-100) */
  pos: { x: number; y: number };
  /** L1/L2/L3 三级原理说明 */
  principle: { L1: string; L2: string; L3: string };
  videoTitle?: string;
  videoDurationSec?: number;
  /** 关联的 KP（slug 列表），先在 KP_LIBRARY 里登记 */
  kps: string[];
};

/* ────────────────────────────────────────────────────────────────
   KP 全库（共用 KP 表，避免重复创建）
──────────────────────────────────────────────────────────────── */
const KP_LIBRARY: KP[] = [
  // ── 力学 ──
  { slug: 'kp-gravity',          name: '重力',           subject: 'PHYSICS',   difficulty: 'L1', summary: '一切有质量的物体都互相吸引；地面附近的物体被地球拉向地心。' },
  { slug: 'kp-friction',         name: '摩擦力',         subject: 'PHYSICS',   difficulty: 'L1', summary: '两接触面相对运动时阻碍运动的力。' },
  { slug: 'kp-lever',            name: '杠杆原理',       subject: 'PHYSICS',   difficulty: 'L1', summary: '力 × 力臂 = 阻力 × 阻力臂；支点决定省力或省距离。' },
  { slug: 'kp-pulley',           name: '滑轮组',         subject: 'PHYSICS',   difficulty: 'L2', summary: '通过定滑轮、动滑轮组合改变力的方向与大小。' },
  { slug: 'kp-energy-cons',      name: '能量守恒',       subject: 'PHYSICS',   difficulty: 'L1', summary: '能量不能凭空产生或消失，只能从一种形式转化为另一种。' },
  { slug: 'kp-momentum',         name: '动量守恒',       subject: 'PHYSICS',   difficulty: 'L2', summary: '系统不受外力时总动量守恒；碰撞前后总动量不变。' },
  { slug: 'kp-circular',         name: '圆周运动',       subject: 'PHYSICS',   difficulty: 'L2', summary: '物体沿圆形轨迹运动需要持续指向圆心的向心力。' },
  { slug: 'kp-centripetal',      name: '向心力',         subject: 'PHYSICS',   difficulty: 'L2', summary: 'F = mv²/r：维持圆周运动所需的指向圆心的合力。' },
  { slug: 'kp-buoyancy',         name: '浮力',           subject: 'PHYSICS',   difficulty: 'L1', summary: '阿基米德原理：浮力 = 排开液体的重量。' },
  { slug: 'kp-pressure',         name: '压强',           subject: 'PHYSICS',   difficulty: 'L1', summary: '压力作用于单位面积上的大小：P = F/A。' },
  { slug: 'kp-incline',          name: '斜面与分力',     subject: 'PHYSICS',   difficulty: 'L1', summary: '物体在斜面上时重力被分解为沿斜面和垂直斜面两个分量。' },
  { slug: 'kp-elastic-collision',name: '弹性碰撞',       subject: 'PHYSICS',   difficulty: 'L2', summary: '碰撞前后总动能、总动量都守恒的碰撞。' },
  { slug: 'kp-newton-2',         name: '牛顿第二定律',   subject: 'PHYSICS',   difficulty: 'L1', summary: 'F = ma：物体加速度与所受合力同向，与质量成反比。' },

  // ── 热学 ──
  { slug: 'kp-heat-conduction',  name: '热传导',         subject: 'PHYSICS',   difficulty: 'L1', summary: '热量通过分子振动从高温区传到低温区。' },
  { slug: 'kp-convection',       name: '热对流',         subject: 'PHYSICS',   difficulty: 'L1', summary: '流体受热膨胀上升、冷却下沉，形成循环流动。' },
  { slug: 'kp-radiation',        name: '热辐射',         subject: 'PHYSICS',   difficulty: 'L2', summary: '物体以电磁波方式向外发射热量，无需介质。' },
  { slug: 'kp-phase-change',     name: '相变与潜热',     subject: 'PHYSICS',   difficulty: 'L2', summary: '物质在固液气三态间转化时吸收或释放大量热。' },
  { slug: 'kp-refrigerant',      name: '制冷剂循环',     subject: 'PHYSICS',   difficulty: 'L2', summary: '压缩-冷凝-膨胀-蒸发循环，通过相变把热量从冷端搬到热端。' },
  { slug: 'kp-evaporation',      name: '蒸发与冷却',     subject: 'PHYSICS',   difficulty: 'L1', summary: '液体表面分子获得能量进入气相，带走热量。' },
  { slug: 'kp-microwave',        name: '微波加热',       subject: 'PHYSICS',   difficulty: 'L2', summary: '2.45 GHz 微波让水分子高速振动产生热量。' },
  { slug: 'kp-thermal-expansion',name: '热胀冷缩',       subject: 'PHYSICS',   difficulty: 'L1', summary: '物体温度升高时体积通常增大、温度降低时收缩。' },

  // ── 光学 ──
  { slug: 'kp-reflection',       name: '光的反射',       subject: 'PHYSICS',   difficulty: 'L1', summary: '入射角等于反射角；镜面与漫反射的区别。' },
  { slug: 'kp-refraction',       name: '光的折射',       subject: 'PHYSICS',   difficulty: 'L1', summary: '光从一种介质进入另一种时方向改变，斯涅尔定律。' },
  { slug: 'kp-lens',             name: '透镜成像',       subject: 'PHYSICS',   difficulty: 'L2', summary: '凸透镜会聚、凹透镜发散；物距像距与焦距的关系。' },
  { slug: 'kp-color-mixing',     name: '三原色与色彩',   subject: 'PHYSICS',   difficulty: 'L1', summary: 'RGB 加色法合成所有屏幕色彩；颜料是 CMY 减色法。' },
  { slug: 'kp-polarization',     name: '偏振光',         subject: 'PHYSICS',   difficulty: 'L3', summary: '光波振动方向受限于特定平面，是 3D 眼镜与液晶显示的基础。' },
  { slug: 'kp-laser',            name: '激光原理',       subject: 'PHYSICS',   difficulty: 'L3', summary: '受激辐射产生高相干、单色、定向的光束。' },
  { slug: 'kp-spectrum',         name: '光谱与色散',     subject: 'PHYSICS',   difficulty: 'L2', summary: '不同颜色光的折射率不同，棱镜可将白光分解为光谱。' },
  { slug: 'kp-fluorescence',     name: '荧光发光',       subject: 'PHYSICS',   difficulty: 'L2', summary: '物质吸收高能光后短时间内发出可见光。' },

  // ── 电磁 ──
  { slug: 'kp-electric-circuit', name: '电路与电流',     subject: 'PHYSICS',   difficulty: 'L1', summary: '电荷在闭合回路中定向移动形成电流。' },
  { slug: 'kp-electromagnetism', name: '电磁感应',       subject: 'PHYSICS',   difficulty: 'L2', summary: '磁通量变化在导体中产生感应电动势。' },
  { slug: 'kp-motor',            name: '电动机原理',     subject: 'PHYSICS',   difficulty: 'L2', summary: '通电导线在磁场中受力，旋转输出机械能。' },
  { slug: 'kp-semiconductor',    name: '半导体',         subject: 'PHYSICS',   difficulty: 'L3', summary: 'PN 结的单向导电性是二极管、晶体管的基础。' },
  { slug: 'kp-led',              name: 'LED 发光',       subject: 'PHYSICS',   difficulty: 'L2', summary: '半导体 PN 结电子-空穴复合时发射特定波长的光子。' },
  { slug: 'kp-wifi',             name: 'Wi-Fi 电磁波',   subject: 'PHYSICS',   difficulty: 'L2', summary: '2.4/5 GHz 无线电波在空气中传输数字信号。' },
  { slug: 'kp-em-wave',          name: '电磁波',         subject: 'PHYSICS',   difficulty: 'L2', summary: '电磁场振荡传播形成电磁波，可见光也是。' },
  { slug: 'kp-x-ray',            name: 'X 射线',         subject: 'PHYSICS',   difficulty: 'L3', summary: '高能电磁辐射穿透软组织，被骨骼吸收形成影像。' },
  { slug: 'kp-defibrillator',    name: '除颤原理',       subject: 'PHYSICS',   difficulty: 'L3', summary: '瞬间大电流让心脏所有肌肉同步去极化以重启正常节律。' },

  // ── 声学 ──
  { slug: 'kp-sound-wave',       name: '声波',           subject: 'PHYSICS',   difficulty: 'L1', summary: '介质中振动以纵波形式传播形成声音。' },
  { slug: 'kp-resonance',        name: '共振',           subject: 'PHYSICS',   difficulty: 'L2', summary: '驱动频率接近物体固有频率时振幅显著增大。' },
  { slug: 'kp-doppler',          name: '多普勒效应',     subject: 'PHYSICS',   difficulty: 'L2', summary: '波源与观察者相对运动时观察到的频率发生变化。' },
  { slug: 'kp-ultrasound',       name: '超声波应用',     subject: 'PHYSICS',   difficulty: 'L2', summary: '高于人耳听觉的声波，用于测距、清洗、医学成像。' },

  // ── 化学 ──
  { slug: 'kp-acid-base',        name: '酸碱与 pH',      subject: 'CHEMISTRY', difficulty: 'L1', summary: 'pH 衡量溶液酸碱性；中性为 7，酸性 <7，碱性 >7。' },
  { slug: 'kp-oxidation',        name: '氧化反应',       subject: 'CHEMISTRY', difficulty: 'L1', summary: '物质与氧结合的反应；燃烧、生锈、呼吸都是氧化。' },
  { slug: 'kp-combustion',       name: '燃烧三要素',     subject: 'CHEMISTRY', difficulty: 'L1', summary: '可燃物、助燃物（氧气）、达到着火点缺一不可。' },
  { slug: 'kp-dissolution',      name: '溶解',           subject: 'CHEMISTRY', difficulty: 'L1', summary: '溶质分子分散到溶剂中形成均匀的溶液。' },
  { slug: 'kp-fermentation',     name: '发酵',           subject: 'BIOLOGY',   difficulty: 'L1', summary: '微生物在无氧或缺氧条件下把糖转化为酒精/乳酸等。' },
  { slug: 'kp-osmosis',          name: '渗透压',         subject: 'CHEMISTRY', difficulty: 'L2', summary: '半透膜两侧浓度不同时水分子单向扩散产生压力。' },
  { slug: 'kp-emulsification',   name: '乳化',           subject: 'CHEMISTRY', difficulty: 'L2', summary: '表面活性剂让原本不混溶的两种液体形成稳定混合体系。' },
  { slug: 'kp-co2-soda',         name: '二氧化碳与气泡', subject: 'CHEMISTRY', difficulty: 'L1', summary: 'CO₂ 加压溶于水中形成碳酸，开盖时释放形成气泡。' },
  { slug: 'kp-catalyst',         name: '催化剂',         subject: 'CHEMISTRY', difficulty: 'L2', summary: '加快化学反应速率而本身在反应前后不发生变化的物质。' },
  { slug: 'kp-polymer',          name: '高分子化合物',   subject: 'CHEMISTRY', difficulty: 'L2', summary: '由许多重复单元组成的大分子，如塑料、橡胶、蛋白质。' },
  { slug: 'kp-pigment',          name: '色素与显色',     subject: 'CHEMISTRY', difficulty: 'L2', summary: '分子结构决定吸收哪种波长的光，反射的就是我们看到的颜色。' },
  { slug: 'kp-dye',              name: '染色化学',       subject: 'CHEMISTRY', difficulty: 'L2', summary: '染料分子通过共价键、范德华力等与纤维结合。' },
  { slug: 'kp-soap',             name: '皂化与洗涤',     subject: 'CHEMISTRY', difficulty: 'L2', summary: '表面活性剂分子的两端分别亲水和亲油，把油污带走。' },

  // ── 生物 ──
  { slug: 'kp-photosynthesis',   name: '光合作用',       subject: 'BIOLOGY',   difficulty: 'L1', summary: '植物利用光能把 CO₂ 和水合成有机物并释放氧气。' },
  { slug: 'kp-respiration',      name: '细胞呼吸',       subject: 'BIOLOGY',   difficulty: 'L2', summary: '细胞把葡萄糖与氧气反应释放能量、生成 CO₂ 和水。' },
  { slug: 'kp-pollination',      name: '授粉',           subject: 'BIOLOGY',   difficulty: 'L1', summary: '花粉从雄蕊传到雌蕊柱头完成受精，蜜蜂、风都是媒介。' },
  { slug: 'kp-ecosystem',        name: '生态系统',       subject: 'BIOLOGY',   difficulty: 'L2', summary: '生物与非生物环境构成的物质循环和能量流动系统。' },
  { slug: 'kp-circulation',      name: '血液循环',       subject: 'BIOLOGY',   difficulty: 'L2', summary: '心脏泵血推动血液在血管中循环，运输氧气与养分。' },
  { slug: 'kp-immune',           name: '免疫反应',       subject: 'BIOLOGY',   difficulty: 'L2', summary: '免疫细胞识别并消灭外来病原体、保护机体。' },
  { slug: 'kp-pharma',           name: '药物作用',       subject: 'BIOLOGY',   difficulty: 'L3', summary: '药物分子与体内受体结合产生药效。' },
  { slug: 'kp-sterilization',    name: '消毒灭菌',       subject: 'BIOLOGY',   difficulty: 'L1', summary: '通过热、辐射、化学剂杀灭微生物。' },
  { slug: 'kp-bacteria',         name: '细菌与微生物',   subject: 'BIOLOGY',   difficulty: 'L1', summary: '肉眼看不见的单细胞生物，有些有益、有些致病。' },
  { slug: 'kp-yeast',            name: '酵母菌发酵',     subject: 'BIOLOGY',   difficulty: 'L1', summary: '酵母把糖发酵产生 CO₂ 和酒精，让面团膨胀。' },

  // ── 地理/环境 ──
  { slug: 'kp-water-cycle',      name: '水循环',         subject: 'GEOGRAPHY', difficulty: 'L1', summary: '蒸发-降水-地表径流-地下水构成水的全球循环。' },
  { slug: 'kp-weather',          name: '天气与气压',     subject: 'GEOGRAPHY', difficulty: 'L1', summary: '大气压差驱动风、决定云雨变化。' },
  { slug: 'kp-soil',             name: '土壤与养分',     subject: 'GEOGRAPHY', difficulty: 'L1', summary: '矿物、有机质和水共同构成植物根系生长的基质。' },
  { slug: 'kp-solar-energy',     name: '太阳能',         subject: 'PHYSICS',   difficulty: 'L2', summary: '光伏电池把光能直接转化为电能。' },
  { slug: 'kp-wind-flow',        name: '风的流动',       subject: 'GEOGRAPHY', difficulty: 'L1', summary: '空气从高压区流向低压区形成风。' },
];

/* ────────────────────────────────────────────────────────────────
   每个 L2 场景的物品定义（家厨房保留原数据，仅写需要补的）

   位置坐标系：x/y ∈ [0,100]，对应 2.5D 场景图百分比
──────────────────────────────────────────────────────────────── */
const L2_ITEMS: Record<string, ItemDef[]> = {
  /* ─── 家 · 客厅 (补 4 个 → 共 5) ─────────────────────────────── */
  'home-living': [
    { slug: 'liv-ac', name: '空调', shortDesc: '让室内吹凉风/暖风的电器', pos: { x: 78, y: 22 },
      principle: {
        L1: '空调是一台"热搬运工"，把屋里的热量搬到屋外。',
        L2: '通过制冷剂在压缩机、冷凝器、膨胀阀、蒸发器中循环，相变吸热放热。',
        L3: '逆卡诺循环：制冷剂在压缩时升温、冷凝时放热、节流降温、蒸发时吸热。',
      },
      videoTitle: '空调如何把热"搬"出去', videoDurationSec: 120,
      kps: ['kp-refrigerant', 'kp-phase-change', 'kp-heat-conduction'] },
    { slug: 'liv-router', name: 'Wi-Fi 路由器', shortDesc: '把网线变成无线电波', pos: { x: 25, y: 18 },
      principle: {
        L1: '路由器把家里有线网信号转成空气里看不见的无线电波。',
        L2: '使用 2.4 GHz / 5 GHz 频段电磁波承载数字信号。',
        L3: 'OFDM/MIMO 多输入多输出技术让多天线并行传输。',
      },
      videoTitle: 'Wi-Fi 是怎么工作的', videoDurationSec: 90,
      kps: ['kp-wifi', 'kp-em-wave', 'kp-electric-circuit'] },
    { slug: 'liv-sofa', name: '沙发', shortDesc: '靠弹簧 + 海绵分散身体压力', pos: { x: 52, y: 65 },
      principle: {
        L1: '坐在沙发上很舒服，是因为弹簧和海绵把身体压力分散开了。',
        L2: '弹簧、海绵都是弹性体，受力时变形吸收能量。',
        L3: '材料的杨氏模量决定了它在受压时的形变特性。',
      },
      kps: ['kp-pressure', 'kp-polymer', 'kp-elastic-collision'] },
    { slug: 'liv-lamp', name: '落地灯', shortDesc: 'LED 灯把电变成光', pos: { x: 12, y: 35 },
      principle: {
        L1: '灯泡里的小芯片通电就发光，比老式灯泡省电得多。',
        L2: 'LED 是半导体器件，电子-空穴对复合时辐射光子。',
        L3: '不同半导体材料带隙不同，决定了发射光的波长（颜色）。',
      },
      kps: ['kp-led', 'kp-semiconductor', 'kp-color-mixing'] },
  ],

  /* ─── 家 · 卫生间 ─────────────────────────────────────────── */
  'home-bath': [
    { slug: 'bath-heater', name: '热水器', shortDesc: '冷水进、热水出的换热设备', pos: { x: 18, y: 28 },
      principle: { L1: '冷水流过加热管被烤热再流出来。', L2: '电热丝/燃气把水加热到设定温度。', L3: '热交换器面积与水流速度决定输出温度。' },
      videoTitle: '热水器内部结构', videoDurationSec: 90,
      kps: ['kp-heat-conduction', 'kp-convection', 'kp-electric-circuit'] },
    { slug: 'bath-toilet', name: '马桶', shortDesc: '利用虹吸原理冲走污物', pos: { x: 65, y: 60 },
      principle: { L1: '按下冲水键，水把脏东西"吸"走。', L2: '虹吸管利用大气压差和水柱重力把水排空。', L3: '虹吸时管内压力低于大气压，水被压力差推动。' },
      kps: ['kp-pressure', 'kp-buoyancy', 'kp-water-cycle'] },
    { slug: 'bath-mirror', name: '镜子', shortDesc: '光的反射，会"起雾"', pos: { x: 30, y: 20 },
      principle: { L1: '镜子能照见自己是因为光被反射回来；洗澡水汽附在表面就起雾。', L2: '镜背镀银反射可见光；水汽凝结形成微小水滴漫反射光线。', L3: '反射率取决于金属层；露点温度决定何时起雾。' },
      kps: ['kp-reflection', 'kp-evaporation', 'kp-phase-change'] },
    { slug: 'bath-soap', name: '香皂', shortDesc: '把油污从皮肤上带走', pos: { x: 50, y: 45 },
      principle: { L1: '肥皂能把手上的油变成可以被水冲掉的小颗粒。', L2: '表面活性剂的亲油端包住油污、亲水端朝外，形成胶束。', L3: '皂化反应：油脂 + 强碱 → 高级脂肪酸钠盐 + 甘油。' },
      kps: ['kp-soap', 'kp-emulsification', 'kp-dissolution'] },
    { slug: 'bath-shower', name: '花洒', shortDesc: '让水变成温和的细水柱', pos: { x: 82, y: 30 },
      principle: { L1: '花洒把一股水分成很多细水柱。', L2: '小孔阵列让水流以高速喷出但流量受限。', L3: '伯努利原理：流速越快、压强越小。' },
      kps: ['kp-pressure', 'kp-water-cycle', 'kp-wind-flow'] },
  ],

  /* ─── 家 · 卧室 ─────────────────────────────────────────── */
  'home-bedroom': [
    { slug: 'bed-bed',   name: '床',         shortDesc: '让身体均匀分散压力', pos: { x: 50, y: 55 },
      principle: { L1: '床垫让你的身体均匀受力。', L2: '弹簧或记忆棉吸收压力实现压力分散。', L3: '压强 = F/A，接触面积越大压强越小。' },
      kps: ['kp-pressure', 'kp-elastic-collision', 'kp-polymer'] },
    { slug: 'bed-lamp',  name: '台灯',       shortDesc: '可调亮度的局部照明', pos: { x: 22, y: 38 },
      principle: { L1: '台灯亮度可以调，方便看书。', L2: 'PWM 脉冲宽度调制改变 LED 平均电流。', L3: '人眼对光强度变化呈对数响应，调光呈非线性。' },
      kps: ['kp-led', 'kp-electric-circuit', 'kp-color-mixing'] },
    { slug: 'bed-humid', name: '加湿器',     shortDesc: '把水变成细雾的小机器', pos: { x: 78, y: 42 },
      principle: { L1: '加湿器让屋子里空气湿润。', L2: '超声波震荡片在水面产生雾化。', L3: '高频振动让水分子断裂表面张力形成微滴。' },
      kps: ['kp-ultrasound', 'kp-evaporation', 'kp-water-cycle'] },
    { slug: 'bed-curtain', name: '窗帘',     shortDesc: '挡光与保温的布', pos: { x: 12, y: 18 },
      principle: { L1: '拉上窗帘屋里就变暗。', L2: '窗帘吸收 / 散射可见光，遮光率取决于材质致密度。', L3: '反射型窗帘能阻挡红外辐射，降低空调能耗。' },
      kps: ['kp-reflection', 'kp-radiation', 'kp-polymer'] },
    { slug: 'bed-blanket', name: '被子',     shortDesc: '保温的关键是空气', pos: { x: 50, y: 78 },
      principle: { L1: '被子让人不冷其实是因为里面的空气。', L2: '空气热导率低，被子里的纤维网络储存大量静止空气。', L3: '克罗值（clo）衡量保温性能，与纤维含量成正比。' },
      kps: ['kp-heat-conduction', 'kp-convection', 'kp-polymer'] },
  ],

  /* ─── 家 · 书房 ─────────────────────────────────────────── */
  'home-study': [
    { slug: 'std-computer', name: '电脑',       shortDesc: '电信号变成屏幕画面', pos: { x: 50, y: 45 },
      principle: { L1: '电脑用 CPU 处理信息，再在屏幕上显示画面。', L2: 'CPU 用晶体管开关组合实现运算。', L3: '冯·诺依曼架构：存储与运算分离。' },
      kps: ['kp-semiconductor', 'kp-electric-circuit', 'kp-led'] },
    { slug: 'std-printer',  name: '打印机',     shortDesc: '把数字变成纸上的字', pos: { x: 80, y: 50 },
      principle: { L1: '打印机把屏幕上的字"画"到纸上。', L2: '喷墨机让微小墨滴精确落在纸上特定位置。', L3: '压电式或热泡式喷墨头实现微滴定位。' },
      kps: ['kp-pressure', 'kp-pigment', 'kp-electric-circuit'] },
    { slug: 'std-lamp',     name: '护眼台灯',   shortDesc: '减少屏幕反光的灯', pos: { x: 22, y: 35 },
      principle: { L1: '护眼灯的光柔和均匀不刺眼。', L2: '广角漫射设计避免直射强光形成的眩光。', L3: '色温 4000K + 高显色指数（CRI>90）模拟自然光。' },
      kps: ['kp-led', 'kp-color-mixing', 'kp-spectrum'] },
    { slug: 'std-book',     name: '书',         shortDesc: '油墨在纸上的色彩反射', pos: { x: 32, y: 70 },
      principle: { L1: '书上的字其实是不反光的小颗粒。', L2: '油墨吸收特定波长可见光，反射其他形成字迹。', L3: '碳黑颗粒吸收全可见光，呈现深黑色。' },
      kps: ['kp-reflection', 'kp-pigment', 'kp-polymer'] },
    { slug: 'std-clock',    name: '挂钟',       shortDesc: '通过摆动稳定计时', pos: { x: 65, y: 18 },
      principle: { L1: '钟表能准确告诉时间。', L2: '石英晶体在电压驱动下按固定频率振动。', L3: '32768 Hz 石英晶体经分频得到 1 Hz 秒脉冲。' },
      kps: ['kp-resonance', 'kp-electric-circuit', 'kp-semiconductor'] },
  ],

  /* ─── 家 · 阳台 ─────────────────────────────────────────── */
  'home-balcony': [
    { slug: 'bal-clothes-rack', name: '晾衣架', shortDesc: '让水分自然蒸发到空气中', pos: { x: 45, y: 28 },
      principle: { L1: '湿衣服挂出去就干了，是因为水跑到空气里。', L2: '水分子在表面获得能量进入气相。', L3: '蒸发速率取决于温度、湿度、风速、表面积。' },
      kps: ['kp-evaporation', 'kp-water-cycle', 'kp-wind-flow'] },
    { slug: 'bal-plant',        name: '盆栽',   shortDesc: '阳光下进行光合作用', pos: { x: 22, y: 60 },
      principle: { L1: '植物白天在叶子里制造食物。', L2: '叶绿体吸收光能将 CO₂ 和水转化为葡萄糖和氧气。', L3: 'Calvin 循环固定碳，光反应分解水产生 O₂。' },
      kps: ['kp-photosynthesis', 'kp-respiration', 'kp-soil'] },
    { slug: 'bal-solar',        name: '太阳能板', shortDesc: '把阳光变成电的板子', pos: { x: 70, y: 25 },
      principle: { L1: '太阳能板晒太阳就能发电。', L2: '光子激发 PN 结电子-空穴对产生电流。', L3: '硅基光伏电池转换效率约 20%-25%。' },
      kps: ['kp-solar-energy', 'kp-semiconductor', 'kp-em-wave'] },
    { slug: 'bal-wind-chime',   name: '风铃', shortDesc: '风让金属管发声', pos: { x: 85, y: 50 },
      principle: { L1: '风吹动风铃，叮叮当当响。', L2: '风激发金属管的固有频率产生共振。', L3: '管长决定基频，管径决定谐波分布。' },
      kps: ['kp-resonance', 'kp-sound-wave', 'kp-wind-flow'] },
    { slug: 'bal-window',       name: '推拉窗', shortDesc: '滑轨让重玻璃轻松开合', pos: { x: 50, y: 80 },
      principle: { L1: '一推就开的窗户其实有小轮子。', L2: '滚动摩擦比滑动摩擦小很多。', L3: '滚动摩擦系数 ~0.001，滑动摩擦 ~0.3。' },
      kps: ['kp-friction', 'kp-pulley', 'kp-pressure'] },
  ],

  /* ─── 公园 ──────────────────────────────────────────────── */
  'park-lawn': [
    { slug: 'lawn-grass',    name: '青草',     shortDesc: '光合工厂', pos: { x: 50, y: 60 },
      principle: { L1: '草是绿的，因为叶子里有叶绿素。', L2: '叶绿素吸收红蓝光、反射绿光。', L3: '光合电子传递链产生 ATP 和 NADPH。' },
      kps: ['kp-photosynthesis', 'kp-pigment', 'kp-color-mixing'] },
    { slug: 'lawn-dew',      name: '露水',     shortDesc: '夜里凝结的小水珠', pos: { x: 30, y: 75 },
      principle: { L1: '清晨草尖上的水珠是空气里的水变出来的。', L2: '夜间地表温度降至露点以下水汽凝结。', L3: '辐射冷却让物体表面温度低于环境气温。' },
      kps: ['kp-phase-change', 'kp-water-cycle', 'kp-radiation'] },
    { slug: 'lawn-ant',      name: '蚂蚁',     shortDesc: '搬运能力极强的小昆虫', pos: { x: 75, y: 50 },
      principle: { L1: '蚂蚁能搬动比自己重几十倍的东西。', L2: '小身体的截面积相对体重的比值大、肌肉相对力量高。', L3: '比例缩放定律：体长缩为 1/n 后，强度/重量比变 n 倍。' },
      kps: ['kp-newton-2', 'kp-pressure', 'kp-ecosystem'] },
    { slug: 'lawn-cloud',    name: '远处的云', shortDesc: '空中飘着的水滴', pos: { x: 50, y: 15 },
      principle: { L1: '云是天上的小水滴聚在一起。', L2: '水汽上升遇冷凝结附着尘埃粒子。', L3: '凝结核理论：气溶胶决定云滴粒径分布。' },
      kps: ['kp-water-cycle', 'kp-phase-change', 'kp-weather'] },
    { slug: 'lawn-shadow',   name: '树影',     shortDesc: '光被树叶遮挡形成', pos: { x: 18, y: 40 },
      principle: { L1: '树荫凉快是因为太阳被叶子挡住了。', L2: '叶面吸收反射可见光与近红外，减少地面热辐射。', L3: '蒸腾作用进一步降低叶片温度。' },
      kps: ['kp-radiation', 'kp-reflection', 'kp-evaporation'] },
  ],
  'park-lake': [
    { slug: 'lake-fish',     name: '小鱼',     shortDesc: '靠鱼鳔控制浮沉', pos: { x: 55, y: 70 },
      principle: { L1: '鱼能在水里上下游动。', L2: '鱼鳔充放气调节浮力以匹配水的浮力。', L3: '阿基米德原理：浮力 = 排开水的重量。' },
      kps: ['kp-buoyancy', 'kp-pressure', 'kp-ecosystem'] },
    { slug: 'lake-ripple',   name: '水波',     shortDesc: '机械波在水面传播', pos: { x: 30, y: 60 },
      principle: { L1: '丢颗石头水面就泛圈圈。', L2: '能量以横波形式在水面传递。', L3: '水波属于重力-表面张力混合波。' },
      kps: ['kp-sound-wave', 'kp-em-wave', 'kp-resonance'] },
    { slug: 'lake-reflect',  name: '湖中倒影', shortDesc: '光在水面反射', pos: { x: 75, y: 50 },
      principle: { L1: '湖里能看见天和树的影子。', L2: '平滑水面对光做镜面反射形成虚像。', L3: '反射率取决于入射角（菲涅尔公式）。' },
      kps: ['kp-reflection', 'kp-refraction', 'kp-color-mixing'] },
    { slug: 'lake-lotus',    name: '荷叶',     shortDesc: '不沾水的纳米结构', pos: { x: 45, y: 35 },
      principle: { L1: '水在荷叶上滚成珠子滚走。', L2: '叶面微米突起 + 蜡质表面让水滴不能浸润。', L3: '荷叶效应：超疏水表面接触角 >150°。' },
      kps: ['kp-osmosis', 'kp-polymer', 'kp-emulsification'] },
    { slug: 'lake-bridge',   name: '小石桥',   shortDesc: '拱形分散重力', pos: { x: 18, y: 80 },
      principle: { L1: '拱桥坚固耐压。', L2: '拱结构把垂直载荷转化为沿拱方向的压力。', L3: '抛物线拱：仅承受压应力，无弯矩。' },
      kps: ['kp-pressure', 'kp-lever', 'kp-energy-cons'] },
  ],
  'park-flower': [
    { slug: 'flw-petal',     name: '花瓣',     shortDesc: '色素吸光反射特定颜色', pos: { x: 50, y: 50 },
      principle: { L1: '花朵颜色鲜艳是因为有色素。', L2: '类胡萝卜素、花青素吸收特定波长。', L3: 'pH 值改变花青素结构产生不同颜色。' },
      kps: ['kp-pigment', 'kp-color-mixing', 'kp-photosynthesis'] },
    { slug: 'flw-pollen',    name: '花粉',     shortDesc: '雄性生殖细胞', pos: { x: 35, y: 38 },
      principle: { L1: '花粉是植物繁殖用的小颗粒。', L2: '花粉粒含精子细胞，借风/虫到达雌蕊。', L3: '花粉表面雕纹是物种鉴定依据。' },
      kps: ['kp-pollination', 'kp-photosynthesis', 'kp-ecosystem'] },
    { slug: 'flw-bee',       name: '蜜蜂',     shortDesc: '采蜜的小昆虫', pos: { x: 70, y: 30 },
      principle: { L1: '蜜蜂在花间飞来飞去采蜜。', L2: '蜜蜂能感知偏振光定位太阳方向。', L3: '蜂群通过摆尾舞传递花蜜方位距离信息。' },
      kps: ['kp-pollination', 'kp-polarization', 'kp-ecosystem'] },
    { slug: 'flw-fragrance', name: '花香',     shortDesc: '挥发性有机分子', pos: { x: 20, y: 20 },
      principle: { L1: '花香飘得很远。', L2: '醇/醛/酯类挥发性分子扩散到空气中。', L3: '嗅觉受体识别气味分子化学结构。' },
      kps: ['kp-evaporation', 'kp-dissolution', 'kp-polymer'] },
    { slug: 'flw-butterfly', name: '蝴蝶',     shortDesc: '色彩斑斓的飞舞者', pos: { x: 85, y: 65 },
      principle: { L1: '蝴蝶翅膀很漂亮。', L2: '鳞片纳米结构造成结构色（薄膜干涉）。', L3: '不同入射角呈现不同颜色（虹彩效应）。' },
      kps: ['kp-color-mixing', 'kp-spectrum', 'kp-polarization'] },
  ],
  'park-fitness': [
    { slug: 'fit-elliptical', name: '椭圆机', shortDesc: '模拟跑步的低冲击器械', pos: { x: 45, y: 50 },
      principle: { L1: '椭圆机比跑步对膝盖伤害小。', L2: '脚踏板沿椭圆轨迹运动，避免触地冲击。', L3: '飞轮提供运动惯量，模拟连续阻力。' },
      kps: ['kp-friction', 'kp-energy-cons', 'kp-circular'] },
    { slug: 'fit-bars',       name: '单杠',   shortDesc: '考验上肢力量与杠杆', pos: { x: 20, y: 30 },
      principle: { L1: '单杠把人吊在上面练手臂。', L2: '身体重力 × 重心到手臂的距离 = 力矩。', L3: '不同握法改变力臂长度。' },
      kps: ['kp-lever', 'kp-gravity', 'kp-newton-2'] },
    { slug: 'fit-seesaw',     name: '跷跷板', shortDesc: '两边平衡的杠杆', pos: { x: 75, y: 60 },
      principle: { L1: '两边轻重一样就能平衡。', L2: '力 × 力臂 = 阻力 × 阻力臂。', L3: '转动惯量决定加速度。' },
      kps: ['kp-lever', 'kp-gravity', 'kp-newton-2'] },
    { slug: 'fit-swing',      name: '秋千',   shortDesc: '单摆的简谐运动', pos: { x: 50, y: 25 },
      principle: { L1: '秋千越荡越高，是因为你在使劲。', L2: '单摆周期只取决于长度，与质量无关。', L3: 'T = 2π√(L/g)。' },
      kps: ['kp-energy-cons', 'kp-resonance', 'kp-gravity'] },
    { slug: 'fit-rower',      name: '划船器', shortDesc: '模拟划船的全身器械', pos: { x: 30, y: 78 },
      principle: { L1: '划船器锻炼几乎所有的肌肉。', L2: '飞轮 + 阻尼提供与拉动速度成正比的阻力。', L3: '风阻/水阻/磁阻三种阻力机制。' },
      kps: ['kp-friction', 'kp-energy-cons', 'kp-electromagnetism'] },
  ],
  'park-pavilion': [
    { slug: 'pav-roof',       name: '屋顶',     shortDesc: '挡风遮雨的伞', pos: { x: 50, y: 20 },
      principle: { L1: '凉亭的顶能挡太阳挡雨。', L2: '坡屋顶利用重力让雨水快速流走。', L3: '出挑屋檐遮挡夏季高角太阳辐射。' },
      kps: ['kp-radiation', 'kp-water-cycle', 'kp-gravity'] },
    { slug: 'pav-pillar',     name: '柱子',     shortDesc: '承重的支柱', pos: { x: 22, y: 55 },
      principle: { L1: '柱子托住屋顶不让它塌。', L2: '压力沿柱子轴向传到地面。', L3: '欧拉公式：临界压力 P = π²EI/L²。' },
      kps: ['kp-pressure', 'kp-gravity', 'kp-newton-2'] },
    { slug: 'pav-bench',      name: '木长椅',   shortDesc: '坐下休息的板凳', pos: { x: 50, y: 70 },
      principle: { L1: '坐在木板上很硬。', L2: '木材抗弯强度依赖纹理方向。', L3: '木质素纤维平行排列提供刚度。' },
      kps: ['kp-pressure', 'kp-polymer', 'kp-friction'] },
    { slug: 'pav-shadow',     name: '亭中阴凉', shortDesc: '比外面凉爽几度', pos: { x: 65, y: 45 },
      principle: { L1: '凉亭里比外面凉快。', L2: '屋顶遮挡阳光直射、空气对流带走热量。', L3: '蒸腾散热 + 阴影辐射温差可达 5℃。' },
      kps: ['kp-radiation', 'kp-convection', 'kp-evaporation'] },
    { slug: 'pav-echo',       name: '回声',     shortDesc: '声音在亭子里被反射', pos: { x: 80, y: 30 },
      principle: { L1: '在亭子里说话有回音。', L2: '硬质壁面反射声波，与原声叠加。', L3: '混响时间 RT60 取决于体积与吸声系数。' },
      kps: ['kp-sound-wave', 'kp-reflection', 'kp-resonance'] },
  ],

  /* ─── 学校 ──────────────────────────────────────────────── */
  'school-classroom': [
    { slug: 'cls-blackboard', name: '黑板',     shortDesc: '粉笔字在板上的化学痕迹', pos: { x: 35, y: 30 },
      principle: { L1: '粉笔在黑板上能写字。', L2: '粉笔（碳酸钙）颗粒嵌入黑板涂层缝隙。', L3: '磁性黑板涂层含氧化铁颗粒。' },
      kps: ['kp-friction', 'kp-pigment', 'kp-polymer'] },
    { slug: 'cls-projector',  name: '投影仪',   shortDesc: '把小屏幕放大投到墙上', pos: { x: 50, y: 22 },
      principle: { L1: '投影仪把屏幕画面放大投出。', L2: '透镜组放大液晶/数字微镜阵列上的图像。', L3: 'DLP 数字微镜每秒翻转上万次合成灰阶。' },
      kps: ['kp-lens', 'kp-led', 'kp-color-mixing'] },
    { slug: 'cls-fluorescent',name: '荧光灯',   shortDesc: '紫外光激发荧光粉发可见光', pos: { x: 80, y: 18 },
      principle: { L1: '荧光灯亮起来很省电。', L2: '汞蒸气放电发紫外，荧光粉吸收后再发可见光。', L3: '不同荧光粉配方决定色温与显色性。' },
      kps: ['kp-fluorescence', 'kp-spectrum', 'kp-led'] },
    { slug: 'cls-desk',       name: '课桌',     shortDesc: '稳定的学习平台', pos: { x: 50, y: 65 },
      principle: { L1: '课桌很稳不会倒。', L2: '四脚支撑提供三角形稳定结构。', L3: '重心垂线落在支撑多边形内才稳定。' },
      kps: ['kp-gravity', 'kp-pressure', 'kp-friction'] },
    { slug: 'cls-chalk',      name: '粉笔',     shortDesc: '碳酸钙小柱体', pos: { x: 25, y: 50 },
      principle: { L1: '粉笔写完会变短。', L2: '粉笔颗粒因摩擦力被刮下嵌入黑板。', L3: '碳酸钙莫氏硬度约 3，软质材料。' },
      kps: ['kp-friction', 'kp-pigment', 'kp-pressure'] },
  ],
  'school-lab': [
    { slug: 'lab-burner', name: '酒精灯', shortDesc: '简单的化学加热源', pos: { x: 35, y: 55 },
      principle: { L1: '酒精灯能加热实验器具。', L2: '酒精蒸发后与氧气燃烧释放热量。', L3: '完全燃烧产物为 CO₂ 和水。' },
      kps: ['kp-combustion', 'kp-oxidation', 'kp-heat-conduction'] },
    { slug: 'lab-beaker', name: '烧杯',   shortDesc: '装液体的玻璃容器', pos: { x: 50, y: 60 },
      principle: { L1: '烧杯装液体不漏。', L2: '硼硅玻璃热膨胀系数低，耐热震。', L3: 'SiO₂ + B₂O₃ 网络结构提供化学惰性。' },
      kps: ['kp-thermal-expansion', 'kp-polymer', 'kp-dissolution'] },
    { slug: 'lab-balance',name: '天平',   shortDesc: '精确测量质量', pos: { x: 75, y: 40 },
      principle: { L1: '天平能精确称重。', L2: '杠杆原理通过力臂比例确定质量。', L3: '电子天平用应变片传感器测形变。' },
      kps: ['kp-lever', 'kp-gravity', 'kp-newton-2'] },
    { slug: 'lab-tube',   name: '试管',   shortDesc: '小量反应的容器', pos: { x: 18, y: 35 },
      principle: { L1: '试管很小，做小实验用。', L2: '细长形便于均匀加热和摇匀。', L3: '试管口斜向上倒入避免热应力破裂。' },
      kps: ['kp-thermal-expansion', 'kp-dissolution', 'kp-heat-conduction'] },
    { slug: 'lab-magnet', name: '磁铁',   shortDesc: '产生磁场吸引铁物质', pos: { x: 80, y: 70 },
      principle: { L1: '磁铁能吸住铁。', L2: '永磁体内部磁畴一致定向排列。', L3: '居里温度以上铁磁性消失变为顺磁性。' },
      kps: ['kp-electromagnetism', 'kp-motor', 'kp-thermal-expansion'] },
  ],
  'school-sports': [
    { slug: 'spt-track',    name: '跑道',   shortDesc: '为奔跑而设计的弹性表面', pos: { x: 50, y: 70 },
      principle: { L1: '塑胶跑道踩上去有点弹。', L2: '聚氨酯弹性体吸收冲击保护关节。', L3: '回弹系数决定能量返还效率。' },
      kps: ['kp-friction', 'kp-energy-cons', 'kp-polymer'] },
    { slug: 'spt-hoop',     name: '篮球架', shortDesc: '抛物线运动的目标', pos: { x: 75, y: 25 },
      principle: { L1: '投篮要瞄准框。', L2: '篮球做抛物线运动，初速度和角度决定轨迹。', L3: '最佳投篮角度约 45° + tan⁻¹(h/d)/2。' },
      kps: ['kp-gravity', 'kp-energy-cons', 'kp-newton-2'] },
    { slug: 'spt-flagpole', name: '旗杆',   shortDesc: '靠定滑轮升降旗帜', pos: { x: 15, y: 30 },
      principle: { L1: '拉绳子就能把旗子升上去。', L2: '顶端定滑轮改变力的方向。', L3: '滑轮组可减小拉力但要拉更长距离。' },
      kps: ['kp-pulley', 'kp-lever', 'kp-friction'] },
    { slug: 'spt-ball',     name: '足球',   shortDesc: '充气的弹性球体', pos: { x: 35, y: 55 },
      principle: { L1: '足球能滚能弹。', L2: '充气橡胶腔体提供弹性形变。', L3: '球形 32 面体几何减少空气阻力波动。' },
      kps: ['kp-elastic-collision', 'kp-friction', 'kp-polymer'] },
    { slug: 'spt-rope',     name: '跳绳',   shortDesc: '绕过头脚的圆周运动', pos: { x: 60, y: 80 },
      principle: { L1: '跳绳要跳起来让绳过去。', L2: '绳子做圆周运动，重心轨迹是椭圆。', L3: '甩绳的角速度决定每分钟跳数。' },
      kps: ['kp-circular', 'kp-centripetal', 'kp-energy-cons'] },
  ],
  'school-library': [
    { slug: 'lib-book',     name: '藏书',   shortDesc: '纸张油墨承载知识', pos: { x: 35, y: 50 },
      principle: { L1: '图书馆里很多书。', L2: '纸张是植物纤维网络，油墨吸附其上。', L3: '纤维素长链通过氢键交联形成纸结构。' },
      kps: ['kp-polymer', 'kp-pigment', 'kp-dissolution'] },
    { slug: 'lib-shelf',    name: '书架',   shortDesc: '稳定承载书的结构', pos: { x: 50, y: 30 },
      principle: { L1: '书架能放很多书不会倒。', L2: '层板把分散重力传到立柱。', L3: '矩形截面木方抗弯模量高。' },
      kps: ['kp-pressure', 'kp-gravity', 'kp-lever'] },
    { slug: 'lib-lamp',     name: '阅读灯', shortDesc: '柔和的局部光源', pos: { x: 70, y: 40 },
      principle: { L1: '阅读灯不刺眼。', L2: '漫射罩使光均匀，避免阅读疲劳。', L3: '5000K 白光接近自然光显色性。' },
      kps: ['kp-led', 'kp-reflection', 'kp-color-mixing'] },
    { slug: 'lib-window',   name: '玻璃窗', shortDesc: '采光与隔热', pos: { x: 20, y: 22 },
      principle: { L1: '窗外的光能透进来。', L2: '玻璃对可见光透明，对热辐射不透明。', L3: '低辐射玻璃涂层反射红外。' },
      kps: ['kp-refraction', 'kp-radiation', 'kp-reflection'] },
    { slug: 'lib-silence',  name: '吸音板', shortDesc: '让室内安静的板材', pos: { x: 80, y: 18 },
      principle: { L1: '图书馆很安静。', L2: '多孔材料吸收声波减少反射。', L3: '吸声系数 α 在中高频接近 1.0。' },
      kps: ['kp-sound-wave', 'kp-polymer', 'kp-resonance'] },
  ],
  'school-cafeteria': [
    { slug: 'caf-steam', name: '蒸笼', shortDesc: '水蒸气加热食物', pos: { x: 30, y: 40 },
      principle: { L1: '蒸笼能蒸熟包子。', L2: '水蒸气在食物表面凝结释放潜热。', L3: '100℃ 饱和蒸汽传热效率远高于空气。' },
      kps: ['kp-phase-change', 'kp-convection', 'kp-heat-conduction'] },
    { slug: 'caf-warmer', name: '保温餐车', shortDesc: '维持食物温度', pos: { x: 60, y: 55 },
      principle: { L1: '保温车里的饭一直热乎。', L2: '电热板持续加热 + 保温材料减少散热。', L3: '热水浴均衡加热避免局部过热。' },
      kps: ['kp-heat-conduction', 'kp-convection', 'kp-radiation'] },
    { slug: 'caf-tray',  name: '餐盘',     shortDesc: '分隔食物的容器', pos: { x: 50, y: 75 },
      principle: { L1: '餐盘把不同菜分开。', L2: '不锈钢热容大、不与食物反应。', L3: '18-8 不锈钢含 18%Cr+8%Ni 防腐蚀。' },
      kps: ['kp-oxidation', 'kp-heat-conduction', 'kp-polymer'] },
    { slug: 'caf-soup',  name: '热汤',     shortDesc: '高温液体经对流冷却', pos: { x: 75, y: 30 },
      principle: { L1: '热汤晾一会儿就不烫了。', L2: '表面蒸发 + 周围空气对流带走热量。', L3: '牛顿冷却定律：温差越大冷却越快。' },
      kps: ['kp-evaporation', 'kp-convection', 'kp-phase-change'] },
    { slug: 'caf-rice',  name: '米饭',     shortDesc: '淀粉糊化', pos: { x: 22, y: 70 },
      principle: { L1: '米饭煮熟变软了。', L2: '淀粉颗粒吸水膨胀破裂糊化。', L3: '糊化温度 60-80℃，结构由结晶变非结晶。' },
      kps: ['kp-phase-change', 'kp-dissolution', 'kp-polymer'] },
  ],
  'school-art': [
    { slug: 'art-paint',   name: '颜料',   shortDesc: '不同色素的混合', pos: { x: 35, y: 55 },
      principle: { L1: '颜料能调出很多颜色。', L2: '色素吸收特定波长光，反射其余形成颜色。', L3: 'CMY 减色法 + 黑色 K 是印刷四色。' },
      kps: ['kp-pigment', 'kp-color-mixing', 'kp-spectrum'] },
    { slug: 'art-brush',   name: '画笔',   shortDesc: '毛笔的毛细吸液', pos: { x: 55, y: 65 },
      principle: { L1: '画笔能吸住颜料。', L2: '毛细管现象让液体上升进入毛束间隙。', L3: '接触角 < 90° 时液体上升。' },
      kps: ['kp-osmosis', 'kp-polymer', 'kp-dissolution'] },
    { slug: 'art-paper',   name: '画纸',   shortDesc: '纤维吸水显色', pos: { x: 50, y: 75 },
      principle: { L1: '画纸吸水会有颜色变化。', L2: '纤维素纤维通过毛细作用吸液。', L3: '纸张表面胶料决定吸水性。' },
      kps: ['kp-polymer', 'kp-dissolution', 'kp-pigment'] },
    { slug: 'art-water',   name: '水罐',   shortDesc: '溶解颜料的工具', pos: { x: 20, y: 50 },
      principle: { L1: '画完笔在水里涮一下就干净了。', L2: '水溶颜料中颜料分子溶解到水里。', L3: '极性分子之间相互溶解。' },
      kps: ['kp-dissolution', 'kp-soap', 'kp-pigment'] },
    { slug: 'art-easel',   name: '画架',   shortDesc: '稳定的支撑结构', pos: { x: 75, y: 35 },
      principle: { L1: '画架不会倒。', L2: '三脚架结构提供稳定。', L3: '重心垂线在三角支撑面内。' },
      kps: ['kp-gravity', 'kp-pressure', 'kp-newton-2'] },
  ],

  /* ─── 医院 ──────────────────────────────────────────────── */
  'hospital-emergency': [
    { slug: 'er-ecg',    name: '心电图',     shortDesc: '记录心脏电活动', pos: { x: 30, y: 45 },
      principle: { L1: '心电图能看出心脏跳动情况。', L2: '电极采集心肌细胞去极化产生的微弱电压。', L3: 'P-QRS-T 波形对应心房-心室电活动。' },
      kps: ['kp-electric-circuit', 'kp-defibrillator', 'kp-circulation'] },
    { slug: 'er-defib',  name: '除颤仪',     shortDesc: '电击恢复心律', pos: { x: 55, y: 35 },
      principle: { L1: '除颤仪能救心脏停跳的人。', L2: '强电流瞬时让全部心肌同步去极化。', L3: '双相截断指数波形减小心肌损伤。' },
      kps: ['kp-defibrillator', 'kp-electric-circuit', 'kp-circulation'] },
    { slug: 'er-iv',     name: '输液架',     shortDesc: '利用重力滴注', pos: { x: 75, y: 55 },
      principle: { L1: '吊瓶液体一滴一滴往下流。', L2: '靠液柱高度产生的重力驱动流动。', L3: '滴速由滴速调节器和液面高度共同决定。' },
      kps: ['kp-gravity', 'kp-pressure', 'kp-water-cycle'] },
    { slug: 'er-bed',    name: '急救床',     shortDesc: '可升降可推动的病床', pos: { x: 50, y: 70 },
      principle: { L1: '急救床可以升高推走。', L2: '液压杆顶起床面、脚轮支持快速移动。', L3: '帕斯卡原理：液压系统按面积比放大力。' },
      kps: ['kp-pressure', 'kp-friction', 'kp-pulley'] },
    { slug: 'er-oxygen', name: '氧气瓶',     shortDesc: '高压罐装的纯氧', pos: { x: 18, y: 28 },
      principle: { L1: '氧气瓶能给病人输氧。', L2: '高压气体经减压阀降到安全使用压力。', L3: '气体在液化-蒸发循环中提纯氧气。' },
      kps: ['kp-pressure', 'kp-phase-change', 'kp-respiration'] },
  ],
  'hospital-xray': [
    { slug: 'xr-machine', name: 'X 光机',   shortDesc: '产生 X 射线照片', pos: { x: 50, y: 35 },
      principle: { L1: 'X 光能照出骨头。', L2: 'X 射线穿透软组织被骨骼吸收形成对比。', L3: 'X 光由电子打靶金属减速辐射产生。' },
      kps: ['kp-x-ray', 'kp-em-wave', 'kp-radiation'] },
    { slug: 'xr-film',    name: 'X 光胶片', shortDesc: '记录穿透影像', pos: { x: 75, y: 65 },
      principle: { L1: '拍完 X 光会有一张片子。', L2: 'X 射线让银盐感光显影。', L3: '数字成像板用光电二极管阵列直接转电信号。' },
      kps: ['kp-x-ray', 'kp-semiconductor', 'kp-pigment'] },
    { slug: 'xr-shield',  name: '铅围裙',   shortDesc: '阻挡 X 射线的防护', pos: { x: 20, y: 55 },
      principle: { L1: '医生穿铅围裙防辐射。', L2: '高原子序数物质吸收 X 射线。', L3: '铅当量厚度 0.35-0.5mm 满足防护要求。' },
      kps: ['kp-x-ray', 'kp-radiation', 'kp-em-wave'] },
    { slug: 'xr-monitor', name: '显示屏',   shortDesc: '查看影像的屏幕', pos: { x: 30, y: 25 },
      principle: { L1: 'X 光片显示在屏幕上。', L2: 'LCD 像素由液晶分子在电压下排列控光。', L3: '医用屏 DICOM 校准保证灰阶准确。' },
      kps: ['kp-led', 'kp-polarization', 'kp-color-mixing'] },
    { slug: 'xr-table',   name: '检查床',   shortDesc: '让患者保持固定姿势', pos: { x: 65, y: 80 },
      principle: { L1: '检查床要让人躺好别动。', L2: '碳纤维床面对 X 射线透明。', L3: '高强度碳纤维同时提供机械支撑。' },
      kps: ['kp-x-ray', 'kp-polymer', 'kp-pressure'] },
  ],
  'hospital-pharmacy': [
    { slug: 'pha-pill',     name: '药片',     shortDesc: '压制的有效成分', pos: { x: 50, y: 50 },
      principle: { L1: '药片吃下去能治病。', L2: '活性成分溶解吸收发挥药效。', L3: '缓释衣膜按设计速率释放药物。' },
      kps: ['kp-pharma', 'kp-dissolution', 'kp-osmosis'] },
    { slug: 'pha-bottle',   name: '药瓶',     shortDesc: '储存药品的容器', pos: { x: 25, y: 40 },
      principle: { L1: '药瓶能保护药不变质。', L2: '深色玻璃阻挡紫外线避免药物降解。', L3: '密封硅胶垫阻隔氧气和湿气。' },
      kps: ['kp-radiation', 'kp-oxidation', 'kp-polymer'] },
    { slug: 'pha-scale',    name: '电子秤',   shortDesc: '精确称量克数', pos: { x: 75, y: 65 },
      principle: { L1: '电子秤能精确称出几克。', L2: '应变片电阻变化反映微小重量。', L3: '惠斯通电桥放大微弱电信号。' },
      kps: ['kp-electric-circuit', 'kp-newton-2', 'kp-gravity'] },
    { slug: 'pha-syrup',    name: '药水',     shortDesc: '溶液形态的药物', pos: { x: 35, y: 75 },
      principle: { L1: '糖浆吃起来甜。', L2: '药物溶于糖浆便于儿童服用。', L3: '抑制味觉受体的甜味分子掩蔽苦味。' },
      kps: ['kp-dissolution', 'kp-pharma', 'kp-osmosis'] },
    { slug: 'pha-fridge',   name: '药品冰箱', shortDesc: '保持药品低温', pos: { x: 80, y: 20 },
      principle: { L1: '有些药要放冰箱里。', L2: '低温减慢化学反应速率延长保质期。', L3: '疫苗冷链 2-8℃ 防止蛋白质失活。' },
      kps: ['kp-refrigerant', 'kp-phase-change', 'kp-pharma'] },
  ],
  'hospital-waiting': [
    { slug: 'wt-thermometer',name: '体温计',   shortDesc: '测量体温的工具', pos: { x: 35, y: 50 },
      principle: { L1: '体温计能量出温度。', L2: '热敏电阻或红外探测器感知温度。', L3: '红外耳温枪测量耳膜热辐射峰值波长。' },
      kps: ['kp-thermal-expansion', 'kp-radiation', 'kp-semiconductor'] },
    { slug: 'wt-bpcuff',     name: '血压计',   shortDesc: '测量心脏泵血压力', pos: { x: 60, y: 40 },
      principle: { L1: '血压计能量血压。', L2: '袖带充气阻断动脉，听诊器听柯氏音。', L3: '示波法电子血压计检测脉搏波包络。' },
      kps: ['kp-pressure', 'kp-circulation', 'kp-sound-wave'] },
    { slug: 'wt-mask',       name: '口罩',     shortDesc: '过滤空气中的病菌', pos: { x: 75, y: 65 },
      principle: { L1: '戴口罩能防止感染。', L2: '多层无纺布过滤微小颗粒和飞沫。', L3: '静电吸附 + 物理拦截双重机制。' },
      kps: ['kp-polymer', 'kp-bacteria', 'kp-sterilization'] },
    { slug: 'wt-disinfect',  name: '消毒液',   shortDesc: '杀灭细菌的液体', pos: { x: 18, y: 35 },
      principle: { L1: '消毒液让手干净。', L2: '75% 酒精破坏细菌细胞膜蛋白质。', L3: '过氧乙酸氧化破坏微生物核酸。' },
      kps: ['kp-sterilization', 'kp-bacteria', 'kp-oxidation'] },
    { slug: 'wt-screen',     name: '叫号屏',   shortDesc: '显示当前序号', pos: { x: 50, y: 18 },
      principle: { L1: '叫号屏显示该谁了。', L2: 'LED 矩阵点亮拼出数字。', L3: '7 段数码管历史与点阵屏的演进。' },
      kps: ['kp-led', 'kp-electric-circuit', 'kp-color-mixing'] },
  ],
  'hospital-surgery': [
    { slug: 'sg-lamp',      name: '无影灯',   shortDesc: '多光源消除阴影', pos: { x: 50, y: 22 },
      principle: { L1: '无影灯没有阴影。', L2: '多 LED 阵列从不同角度照射相互补偿阴影。', L3: '高显色指数 + 蓝光过滤减轻视疲劳。' },
      kps: ['kp-led', 'kp-reflection', 'kp-color-mixing'] },
    { slug: 'sg-scalpel',   name: '手术刀',   shortDesc: '极锋利的不锈钢刀', pos: { x: 38, y: 60 },
      principle: { L1: '手术刀非常锋利。', L2: '极薄刃口减小切割面积、降低组织损伤。', L3: '马氏体不锈钢可硬化至 HRC55+。' },
      kps: ['kp-pressure', 'kp-friction', 'kp-oxidation'] },
    { slug: 'sg-anesthesia',name: '麻醉机',   shortDesc: '让人暂时失去痛觉', pos: { x: 70, y: 35 },
      principle: { L1: '麻醉机让病人手术时睡着。', L2: '麻醉气体抑制大脑神经传导。', L3: '气体浓度通过流量阀精确控制。' },
      kps: ['kp-pharma', 'kp-pressure', 'kp-respiration'] },
    { slug: 'sg-suture',    name: '缝合线',   shortDesc: '可吸收的生物材料', pos: { x: 25, y: 75 },
      principle: { L1: '缝合线能吸收不用拆。', L2: '聚乳酸在体内被酶水解。', L3: '降解周期 60-90 天匹配组织愈合。' },
      kps: ['kp-polymer', 'kp-fermentation', 'kp-immune'] },
    { slug: 'sg-monitor',   name: '监护仪',   shortDesc: '实时显示生命体征', pos: { x: 80, y: 65 },
      principle: { L1: '监护仪屏幕显示心跳呼吸。', L2: '电极采集生物电信号 + 算法识别波形。', L3: '血氧饱和度通过红光与红外光吸收比测算。' },
      kps: ['kp-electric-circuit', 'kp-circulation', 'kp-spectrum'] },
  ],
  'hospital-ward': [
    { slug: 'wd-bed',     name: '电动病床', shortDesc: '可调节高度角度的床', pos: { x: 45, y: 55 },
      principle: { L1: '电动病床可以升降。', L2: '电机驱动丝杠把旋转变为直线运动。', L3: '减速器把高速低扭转换为低速大扭。' },
      kps: ['kp-motor', 'kp-electric-circuit', 'kp-lever'] },
    { slug: 'wd-call',    name: '呼叫铃',   shortDesc: '一键呼叫护士', pos: { x: 25, y: 38 },
      principle: { L1: '按一下铃护士就来了。', L2: '按键闭合电路触发护士站信号。', L3: '无线呼叫使用低功耗 433MHz 电磁波。' },
      kps: ['kp-electric-circuit', 'kp-em-wave', 'kp-wifi'] },
    { slug: 'wd-iv',      name: '输液泵',   shortDesc: '精确控制滴速', pos: { x: 70, y: 30 },
      principle: { L1: '输液泵让液体匀速进入。', L2: '蠕动泵挤压软管输送精确容量。', L3: '步进电机分度旋转控制泵速。' },
      kps: ['kp-motor', 'kp-pressure', 'kp-pharma'] },
    { slug: 'wd-window',  name: '病房窗',   shortDesc: '通风采光的窗户', pos: { x: 18, y: 18 },
      principle: { L1: '窗户能开能关。', L2: '推拉窗轨道允许平移开启。', L3: '中空玻璃隔绝热传导和噪声。' },
      kps: ['kp-heat-conduction', 'kp-sound-wave', 'kp-friction'] },
    { slug: 'wd-screen',  name: '隔帘',     shortDesc: '保护隐私的布帘', pos: { x: 80, y: 75 },
      principle: { L1: '隔帘把床和外面分开。', L2: '不透明布料阻挡可见光。', L3: '抗菌涂层抑制细菌附着。' },
      kps: ['kp-polymer', 'kp-bacteria', 'kp-sterilization'] },
  ],

  /* ─── 超市 ──────────────────────────────────────────────── */
  'super-fresh': [
    { slug: 'fr-spray',   name: '喷雾保湿', shortDesc: '保持蔬果新鲜', pos: { x: 35, y: 30 },
      principle: { L1: '蔬菜区会喷水雾保鲜。', L2: '雾化水滴维持高湿减少蒸腾失水。', L3: '叶片气孔在湿润环境下保持半开。' },
      kps: ['kp-evaporation', 'kp-water-cycle', 'kp-osmosis'] },
    { slug: 'fr-light',   name: '生鲜灯',   shortDesc: '让肉看起来更红', pos: { x: 70, y: 22 },
      principle: { L1: '生鲜灯让肉看起来好看。', L2: '红光波段强化肌红蛋白反射。', L3: '色温 3000K + 高 R9 红色显色。' },
      kps: ['kp-led', 'kp-color-mixing', 'kp-spectrum'] },
    { slug: 'fr-veg',     name: '叶菜',     shortDesc: '叶绿素决定新鲜度', pos: { x: 50, y: 60 },
      principle: { L1: '蔬菜越绿越新鲜。', L2: '叶绿素降解后变黄是衰老信号。', L3: '低温抑制乙烯生成延缓成熟。' },
      kps: ['kp-photosynthesis', 'kp-pigment', 'kp-respiration'] },
    { slug: 'fr-fruit',   name: '水果',     shortDesc: '色素与糖分指示成熟', pos: { x: 25, y: 70 },
      principle: { L1: '水果熟了会变甜。', L2: '淀粉酶解为葡萄糖、有机酸下降。', L3: '乙烯触发番茄红素/花青素合成。' },
      kps: ['kp-pigment', 'kp-fermentation', 'kp-photosynthesis'] },
    { slug: 'fr-scale',   name: '电子秤',   shortDesc: '现场称重打码', pos: { x: 80, y: 70 },
      principle: { L1: '称重后会打印小标签。', L2: '应变片感重 + 热敏纸打印。', L3: '热敏涂层在 75℃ 变色显字。' },
      kps: ['kp-electric-circuit', 'kp-pigment', 'kp-thermal-expansion'] },
  ],
  'super-frozen': [
    { slug: 'fz-cabinet', name: '冷冻柜',   shortDesc: '保持深度低温', pos: { x: 50, y: 50 },
      principle: { L1: '冷冻柜里很冷。', L2: '压缩机循环制冷剂把热搬到柜外。', L3: '逆卡诺循环 COP 反映能效。' },
      kps: ['kp-refrigerant', 'kp-phase-change', 'kp-heat-conduction'] },
    { slug: 'fz-icecream',name: '雪糕',     shortDesc: '固液混合体系', pos: { x: 30, y: 40 },
      principle: { L1: '雪糕硬硬的还有点甜。', L2: '糖+脂肪+冰晶+空气泡形成稳定体系。', L3: '小冰晶 +乳化剂保证细腻口感。' },
      kps: ['kp-phase-change', 'kp-emulsification', 'kp-dissolution'] },
    { slug: 'fz-frost',   name: '冰霜',     shortDesc: '空气水汽凝华', pos: { x: 75, y: 70 },
      principle: { L1: '冷冻柜内壁有冰晶。', L2: '空气水汽直接凝华为冰晶。', L3: '霜降低制冷效率需定期除霜。' },
      kps: ['kp-phase-change', 'kp-evaporation', 'kp-water-cycle'] },
    { slug: 'fz-package', name: '冷冻包装', shortDesc: '阻隔水汽防霜', pos: { x: 22, y: 75 },
      principle: { L1: '冰冻食品都有塑料包装。', L2: '多层塑料阻隔水汽和氧气。', L3: 'PE/EVOH 共挤膜阻隔率高。' },
      kps: ['kp-polymer', 'kp-oxidation', 'kp-phase-change'] },
    { slug: 'fz-thermo',  name: '温度计',   shortDesc: '监控冷链温度', pos: { x: 78, y: 25 },
      principle: { L1: '冷柜上有温度显示。', L2: '热敏电阻 NTC 温度升高电阻下降。', L3: '低温区 NTC β 值需特别校准。' },
      kps: ['kp-thermal-expansion', 'kp-electric-circuit', 'kp-semiconductor'] },
  ],
  'super-drinks': [
    { slug: 'dr-soda',    name: '碳酸饮料', shortDesc: 'CO₂ 溶于水形成气泡', pos: { x: 35, y: 45 },
      principle: { L1: '可乐打开会冒泡。', L2: 'CO₂ 加压溶于水，开盖减压释出。', L3: '亨利定律：气体溶解度与压力成正比。' },
      kps: ['kp-co2-soda', 'kp-pressure', 'kp-dissolution'] },
    { slug: 'dr-water',   name: '矿泉水',   shortDesc: '含微量矿物质', pos: { x: 60, y: 55 },
      principle: { L1: '矿泉水里有矿物。', L2: '溶解的钙镁离子形成软硬度差异。', L3: 'TDS 总溶解固体反映矿物含量。' },
      kps: ['kp-dissolution', 'kp-soil', 'kp-osmosis'] },
    { slug: 'dr-juice',   name: '果汁',     shortDesc: '果肉榨取的天然糖溶液', pos: { x: 22, y: 65 },
      principle: { L1: '果汁是水果挤出来的。', L2: '细胞破碎释放糖和有机酸。', L3: 'NFC 非浓缩还原工艺保留风味。' },
      kps: ['kp-dissolution', 'kp-fermentation', 'kp-pigment'] },
    { slug: 'dr-tea',     name: '茶饮',     shortDesc: '茶多酚溶于热水', pos: { x: 75, y: 30 },
      principle: { L1: '茶能泡出味道。', L2: '热水溶解茶叶中的茶多酚、咖啡因。', L3: '90℃ 提取效率最佳同时减少涩味。' },
      kps: ['kp-dissolution', 'kp-pigment', 'kp-polymer'] },
    { slug: 'dr-shelf',   name: '货架冷柜', shortDesc: '即拿即冷的饮料柜', pos: { x: 80, y: 80 },
      principle: { L1: '货架饮料都是冰的。', L2: '开放式冷柜利用冷气下沉特性。', L3: '空气幕减少冷气溢散。' },
      kps: ['kp-convection', 'kp-refrigerant', 'kp-phase-change'] },
  ],
  'super-checkout': [
    { slug: 'co-scanner', name: '扫码枪',     shortDesc: '激光识别条形码', pos: { x: 40, y: 45 },
      principle: { L1: '扫码枪嘀一下就识别了。', L2: '激光照射条形码、反射差异译码。', L3: 'EAN-13 编码格式 + Reed-Solomon 纠错。' },
      kps: ['kp-laser', 'kp-reflection', 'kp-semiconductor'] },
    { slug: 'co-scale',   name: '收银秤',     shortDesc: '同时计价的电子秤', pos: { x: 65, y: 60 },
      principle: { L1: '称重知道多少钱。', L2: '重量 × 单价 = 价格。', L3: '应变片 + 单片机实时计算。' },
      kps: ['kp-electric-circuit', 'kp-newton-2', 'kp-semiconductor'] },
    { slug: 'co-printer', name: '小票打印机', shortDesc: '热敏打印消费明细', pos: { x: 75, y: 25 },
      principle: { L1: '机器会打印小票。', L2: '热敏头按需加热涂层显字。', L3: '隐色染料受热与显色剂反应变黑。' },
      kps: ['kp-pigment', 'kp-thermal-expansion', 'kp-electric-circuit'] },
    { slug: 'co-pos',     name: 'POS 机',     shortDesc: '收款与扫码', pos: { x: 22, y: 55 },
      principle: { L1: 'POS 机能刷卡。', L2: '银行卡磁条/芯片 + 加密通信。', L3: 'NFC 13.56MHz 近场感应。' },
      kps: ['kp-em-wave', 'kp-electric-circuit', 'kp-semiconductor'] },
    { slug: 'co-conveyor',name: '传送带',     shortDesc: '送商品到收银员处', pos: { x: 50, y: 80 },
      principle: { L1: '把商品放到带子上就送过去。', L2: '电机驱动滚筒带动皮带运动。', L3: '皮带张力与摩擦决定承载能力。' },
      kps: ['kp-motor', 'kp-friction', 'kp-electric-circuit'] },
  ],
  'super-bakery': [
    { slug: 'bk-bread',   name: '面包',     shortDesc: '酵母发酵让面团膨胀', pos: { x: 35, y: 55 },
      principle: { L1: '面包蓬松有酵母的功劳。', L2: '酵母分解糖产生 CO₂ 让面团膨胀。', L3: '面筋蛋白网络捕获气体形成结构。' },
      kps: ['kp-yeast', 'kp-fermentation', 'kp-co2-soda'] },
    { slug: 'bk-oven',    name: '烤箱',     shortDesc: '辐射加热熟食物', pos: { x: 60, y: 35 },
      principle: { L1: '烤箱里很热能烤面包。', L2: '电热管 / 红外辐射加热食物。', L3: '对流烤箱风扇均匀传热。' },
      kps: ['kp-radiation', 'kp-convection', 'kp-heat-conduction'] },
    { slug: 'bk-mixer',   name: '揉面机',   shortDesc: '搅拌让面筋成网', pos: { x: 75, y: 70 },
      principle: { L1: '揉面机替代手揉面。', L2: '机械作用让面筋蛋白形成网络。', L3: '麦谷蛋白和麦胶蛋白通过二硫键交联。' },
      kps: ['kp-polymer', 'kp-motor', 'kp-emulsification'] },
    { slug: 'bk-cookie',  name: '曲奇',     shortDesc: '黄油+糖+面粉的脆点心', pos: { x: 22, y: 75 },
      principle: { L1: '曲奇又香又脆。', L2: '黄油融化形成酥脆结构。', L3: '美拉德反应产生焦香风味。' },
      kps: ['kp-oxidation', 'kp-phase-change', 'kp-pigment'] },
    { slug: 'bk-cream',   name: '奶油',     shortDesc: '高脂乳化体系', pos: { x: 78, y: 22 },
      principle: { L1: '奶油又白又香。', L2: '脂肪球分散在水相形成乳浊液。', L3: '搅拌打入空气形成稳定泡沫。' },
      kps: ['kp-emulsification', 'kp-polymer', 'kp-fermentation'] },
  ],

  /* ─── 商场 ──────────────────────────────────────────────── */
  'mall-electronics': [
    { slug: 'el-tv',      name: '电视',     shortDesc: 'OLED 显示屏', pos: { x: 35, y: 35 },
      principle: { L1: '电视屏幕色彩鲜艳。', L2: 'OLED 每个像素自发光、对比度极高。', L3: '有机半导体材料决定发光颜色。' },
      kps: ['kp-led', 'kp-color-mixing', 'kp-polarization'] },
    { slug: 'el-phone',   name: '手机',     shortDesc: '触摸屏 + SoC', pos: { x: 55, y: 50 },
      principle: { L1: '手机能上网打电话。', L2: 'CPU + 基带 + 屏幕 + 电池集成。', L3: '7nm 制程晶体管以亿计。' },
      kps: ['kp-semiconductor', 'kp-wifi', 'kp-em-wave'] },
    { slug: 'el-speaker', name: '音响',     shortDesc: '电信号变声波', pos: { x: 75, y: 65 },
      principle: { L1: '音响发出声音。', L2: '音圈在磁场中振动推动振膜发声。', L3: '低音单元口径决定低频响应。' },
      kps: ['kp-electromagnetism', 'kp-motor', 'kp-sound-wave'] },
    { slug: 'el-camera',  name: '相机',     shortDesc: '镜头+图像传感器', pos: { x: 22, y: 65 },
      principle: { L1: '相机能拍出清晰照片。', L2: '镜头会聚光线到 CMOS 传感器。', L3: '拜耳阵列彩色滤镜重建 RGB 图像。' },
      kps: ['kp-lens', 'kp-semiconductor', 'kp-color-mixing'] },
    { slug: 'el-headset', name: '耳机',     shortDesc: '直接送声到耳朵', pos: { x: 80, y: 22 },
      principle: { L1: '耳机能私人听音乐。', L2: '动圈单元振膜在线圈通电时振动。', L3: '降噪耳机用反相波抵消噪声。' },
      kps: ['kp-sound-wave', 'kp-electromagnetism', 'kp-resonance'] },
  ],
  'mall-food': [
    { slug: 'fd-grill',   name: '铁板烧',     shortDesc: '高温接触加热', pos: { x: 35, y: 50 },
      principle: { L1: '铁板烧滋滋响。', L2: '高温铁板让食物表面产生美拉德反应。', L3: '热传导效率 = 接触面积 × 温差。' },
      kps: ['kp-heat-conduction', 'kp-oxidation', 'kp-pigment'] },
    { slug: 'fd-fryer',   name: '油炸锅',     shortDesc: '热油快速传热', pos: { x: 60, y: 45 },
      principle: { L1: '炸鸡香脆好吃。', L2: '160℃ 高温油使食物表面快速脱水。', L3: '油炸温度过高产生丙烯酰胺。' },
      kps: ['kp-evaporation', 'kp-heat-conduction', 'kp-oxidation'] },
    { slug: 'fd-soup',    name: '汤锅',       shortDesc: '长时炖煮溶出风味', pos: { x: 22, y: 65 },
      principle: { L1: '炖汤越熬越浓。', L2: '加热让胶原蛋白水解为明胶。', L3: '风味分子需要长时间扩散提取。' },
      kps: ['kp-dissolution', 'kp-polymer', 'kp-heat-conduction'] },
    { slug: 'fd-microwave-fd',name: '微波炉', shortDesc: '让水分子振动发热', pos: { x: 75, y: 30 },
      principle: { L1: '微波炉热饭很快。', L2: '2.45GHz 微波让极性水分子高速振动。', L3: '磁控管将直流电转为微波。' },
      kps: ['kp-microwave', 'kp-em-wave', 'kp-heat-conduction'] },
    { slug: 'fd-ice',     name: '刨冰机',     shortDesc: '把冰削成花', pos: { x: 80, y: 75 },
      principle: { L1: '刨冰机刨出冰花。', L2: '高速旋转刀片刮削冰块。', L3: '低温减小切削阻力。' },
      kps: ['kp-friction', 'kp-phase-change', 'kp-motor'] },
  ],
  'mall-cinema': [
    { slug: 'cm-projector', name: '放映机',   shortDesc: '把胶片画面放上大屏', pos: { x: 40, y: 30 },
      principle: { L1: '放映机投出电影画面。', L2: '激光/氙灯光源 + DLP 微镜阵列。', L3: '激光投影色域 110% Rec.2020。' },
      kps: ['kp-laser', 'kp-lens', 'kp-color-mixing'] },
    { slug: 'cm-screen',    name: '银幕',     shortDesc: '高反射涂层屏幕', pos: { x: 55, y: 50 },
      principle: { L1: '电影屏幕又大又亮。', L2: '玻璃微珠涂层强化反射亮度。', L3: '增益值与视角的折中。' },
      kps: ['kp-reflection', 'kp-polymer', 'kp-color-mixing'] },
    { slug: 'cm-seat',      name: '座椅',     shortDesc: '可放倒的舒适座位', pos: { x: 70, y: 70 },
      principle: { L1: '电影座椅可以放倒。', L2: '液压杆 + 配重弹簧调节角度。', L3: '人体工学曲线减压脊柱。' },
      kps: ['kp-pressure', 'kp-energy-cons', 'kp-pulley'] },
    { slug: 'cm-3dglass',   name: '3D 眼镜',  shortDesc: '偏振光分离左右眼影像', pos: { x: 20, y: 60 },
      principle: { L1: '戴 3D 眼镜画面有立体感。', L2: '左右眼镜片偏振方向 90°。', L3: '圆偏振光适应头部倾斜。' },
      kps: ['kp-polarization', 'kp-spectrum', 'kp-lens'] },
    { slug: 'cm-popcorn',   name: '爆米花机', shortDesc: '玉米粒爆开变蓬松', pos: { x: 78, y: 22 },
      principle: { L1: '爆米花机咣咣响。', L2: '高温让玉米粒内部水蒸气压力暴增膨胀。', L3: '玉米淀粉糊化与外壳破裂的临界压力。' },
      kps: ['kp-phase-change', 'kp-pressure', 'kp-thermal-expansion'] },
  ],
  'mall-arcade': [
    { slug: 'ar-machine', name: '街机',     shortDesc: '游戏柜', pos: { x: 50, y: 45 },
      principle: { L1: '街机里有游戏。', L2: '主板 + 显示器 + 摇杆按键。', L3: 'CPU + 显存共同渲染画面。' },
      kps: ['kp-semiconductor', 'kp-electric-circuit', 'kp-led'] },
    { slug: 'ar-vr',      name: 'VR 头盔',  shortDesc: '沉浸式立体视觉', pos: { x: 75, y: 32 },
      principle: { L1: 'VR 让人感觉在虚拟世界里。', L2: '左右眼独立屏幕产生立体感。', L3: '陀螺仪追踪头部姿态调整画面。' },
      kps: ['kp-polarization', 'kp-led', 'kp-lens'] },
    { slug: 'ar-claw',    name: '抓娃娃机', shortDesc: '电机驱动机械爪', pos: { x: 30, y: 60 },
      principle: { L1: '抓娃娃考验技术。', L2: '电机精确控制爪子上下左右。', L3: '抓力可调，难度由商家设定。' },
      kps: ['kp-motor', 'kp-electric-circuit', 'kp-pulley'] },
    { slug: 'ar-drum',    name: '打鼓游戏', shortDesc: '敲击力度被传感器识别', pos: { x: 22, y: 35 },
      principle: { L1: '敲鼓机器人知道节奏。', L2: '压电传感器把敲击转为电信号。', L3: '机器学习识别力度与时机判分。' },
      kps: ['kp-sound-wave', 'kp-electric-circuit', 'kp-semiconductor'] },
    { slug: 'ar-led',     name: 'LED 阵列', shortDesc: '炫酷光效', pos: { x: 75, y: 75 },
      principle: { L1: '街机灯花花绿绿。', L2: '可寻址 LED 一颗一颗控制颜色。', L3: 'WS2812 单线串行协议。' },
      kps: ['kp-led', 'kp-color-mixing', 'kp-electric-circuit'] },
  ],
  'mall-clothing': [
    { slug: 'cl-fabric',  name: '面料',     shortDesc: '不同纤维织成的布', pos: { x: 40, y: 50 },
      principle: { L1: '衣服面料有很多种。', L2: '棉/涤纶/蚕丝纤维结构不同。', L3: '纺纱纺织决定面料强度。' },
      kps: ['kp-polymer', 'kp-dye', 'kp-friction'] },
    { slug: 'cl-dye',     name: '染色',     shortDesc: '颜色附着纤维', pos: { x: 65, y: 40 },
      principle: { L1: '衣服颜色五彩斑斓。', L2: '染料分子通过共价键/范德华力附着。', L3: '活性染料反应基团与纤维羟基反应。' },
      kps: ['kp-dye', 'kp-pigment', 'kp-polymer'] },
    { slug: 'cl-mirror',  name: '试衣镜',   shortDesc: '反射全身形象', pos: { x: 22, y: 30 },
      principle: { L1: '试衣镜照出整个人。', L2: '平面镜成像左右相反。', L3: '镜背镀铝反射率 85%。' },
      kps: ['kp-reflection', 'kp-color-mixing', 'kp-led'] },
    { slug: 'cl-hanger',  name: '衣架',     shortDesc: '保持衣服形状的支撑', pos: { x: 75, y: 70 },
      principle: { L1: '衣服挂着不变形。', L2: '衣架的肩形分散衣服自重。', L3: '应力分布避免局部拉伸。' },
      kps: ['kp-pressure', 'kp-gravity', 'kp-polymer'] },
    { slug: 'cl-tag',     name: '电子防盗扣', shortDesc: '出门会报警的扣', pos: { x: 50, y: 80 },
      principle: { L1: '没付款的衣服会报警。', L2: '射频标签与门口检测器谐振。', L3: '8.2MHz 声磁标签覆盖大检测距离。' },
      kps: ['kp-em-wave', 'kp-resonance', 'kp-electric-circuit'] },
  ],

  /* ─── 游乐场 ────────────────────────────────────────────── */
  'play-carousel': [
    { slug: 'cs-horse',   name: '木马',     shortDesc: '上下浮动 + 旋转', pos: { x: 35, y: 55 },
      principle: { L1: '木马转着圈，还会上下动。', L2: '凸轮把旋转变成上下运动。', L3: '正弦曲线决定上下运动节奏。' },
      kps: ['kp-circular', 'kp-energy-cons', 'kp-motor'] },
    { slug: 'cs-center',  name: '中心立柱', shortDesc: '旋转轴', pos: { x: 50, y: 40 },
      principle: { L1: '木马绕着中间柱转。', L2: '电机驱动顶部齿轮带动整个圆盘。', L3: '轴承减小摩擦稳定旋转。' },
      kps: ['kp-circular', 'kp-motor', 'kp-friction'] },
    { slug: 'cs-music',   name: '音乐盒',   shortDesc: '伴乐的机械装置', pos: { x: 70, y: 30 },
      principle: { L1: '木马放着音乐。', L2: '揿钉拨动金属簧片发声。', L3: '簧片长短决定音高。' },
      kps: ['kp-sound-wave', 'kp-resonance', 'kp-motor'] },
    { slug: 'cs-roof',    name: '顶棚',     shortDesc: '装饰的圆顶', pos: { x: 50, y: 18 },
      principle: { L1: '木马上面有彩色顶棚。', L2: '圆锥形结构分散自重和风压。', L3: '撑杆均匀传力到中央立柱。' },
      kps: ['kp-pressure', 'kp-gravity', 'kp-lever'] },
    { slug: 'cs-light',   name: '彩灯',     shortDesc: '旋转的灯', pos: { x: 22, y: 35 },
      principle: { L1: '木马转的时候灯也闪。', L2: '滑环导电让旋转部分仍可通电。', L3: 'PWM 调光实现彩色变化。' },
      kps: ['kp-led', 'kp-electric-circuit', 'kp-color-mixing'] },
  ],
  'play-coaster': [
    { slug: 'rc-track',   name: '轨道',     shortDesc: '过山车的物理路径', pos: { x: 50, y: 35 },
      principle: { L1: '过山车在轨道上飞驰。', L2: '势能转化为动能完成俯冲。', L3: '回环顶点速度需要 v² ≥ rg。' },
      kps: ['kp-energy-cons', 'kp-circular', 'kp-centripetal'] },
    { slug: 'rc-car',     name: '车厢',     shortDesc: '过山车的座舱', pos: { x: 30, y: 55 },
      principle: { L1: '过山车的车厢座位紧紧夹住人。', L2: '约束系统抗 4G 加速度。', L3: '碳钢轮抗压、橡胶轮减振。' },
      kps: ['kp-centripetal', 'kp-friction', 'kp-newton-2'] },
    { slug: 'rc-loop',    name: '回环',     shortDesc: '完整 360° 翻转', pos: { x: 70, y: 28 },
      principle: { L1: '过山车能 360 度翻转。', L2: '顶部最低速度由向心力等式决定。', L3: '泪滴形回环减小入口加速度。' },
      kps: ['kp-circular', 'kp-centripetal', 'kp-gravity'] },
    { slug: 'rc-brake',   name: '制动器',   shortDesc: '终点减速装置', pos: { x: 22, y: 80 },
      principle: { L1: '过山车回到站会自动停下。', L2: '电磁刹车用涡流产生制动力。', L3: '导轨与车体磁场相对运动感应涡流。' },
      kps: ['kp-electromagnetism', 'kp-friction', 'kp-energy-cons'] },
    { slug: 'rc-lift',    name: '提升链',   shortDesc: '把车厢拉到最高点', pos: { x: 80, y: 65 },
      principle: { L1: '过山车开始时被链条拉上去。', L2: '电机驱动链条做正功增加重力势能。', L3: '势能 = mgh 决定后续动能上限。' },
      kps: ['kp-energy-cons', 'kp-motor', 'kp-pulley'] },
  ],
  'play-seesaw': [
    { slug: 'ss-fulcrum', name: '支点',     shortDesc: '杠杆旋转的中心', pos: { x: 50, y: 60 },
      principle: { L1: '跷跷板中间是支点。', L2: '支点把两端的转动力相互平衡。', L3: '理想支点摩擦小、形变小。' },
      kps: ['kp-lever', 'kp-friction', 'kp-pressure'] },
    { slug: 'ss-board',   name: '板子',     shortDesc: '两端坐人的横梁', pos: { x: 50, y: 50 },
      principle: { L1: '板子两边一上一下。', L2: '重 × 力臂 = 平衡的等式。', L3: '板子有弹性产生振荡。' },
      kps: ['kp-lever', 'kp-gravity', 'kp-newton-2'] },
    { slug: 'ss-handle',  name: '把手',     shortDesc: '抓握保持平衡', pos: { x: 25, y: 30 },
      principle: { L1: '坐跷跷板要抓住把手。', L2: '增大摩擦防止滑落。', L3: '橡胶外套增大接触面与摩擦系数。' },
      kps: ['kp-friction', 'kp-polymer', 'kp-pressure'] },
    { slug: 'ss-spring',  name: '缓冲弹簧', shortDesc: '缓冲落地冲击', pos: { x: 75, y: 75 },
      principle: { L1: '跷跷板下面有弹簧。', L2: '弹簧吸收下落动能转换为弹性势能。', L3: '胡克定律 F = -kx。' },
      kps: ['kp-elastic-collision', 'kp-energy-cons', 'kp-newton-2'] },
    { slug: 'ss-sand',    name: '沙坑',     shortDesc: '安全缓冲区', pos: { x: 70, y: 85 },
      principle: { L1: '跷跷板下面是沙地。', L2: '沙子吸收冲击力保护使用者。', L3: '沙粒间的滑动摩擦消散冲击能量。' },
      kps: ['kp-friction', 'kp-energy-cons', 'kp-pressure'] },
  ],
  'play-slide': [
    { slug: 'sl-surface', name: '滑道',     shortDesc: '光滑的斜面', pos: { x: 50, y: 50 },
      principle: { L1: '滑梯滑得快。', L2: '低摩擦让重力分量推动加速。', L3: '塑料表面摩擦系数 ~0.2。' },
      kps: ['kp-incline', 'kp-friction', 'kp-gravity'] },
    { slug: 'sl-stairs',  name: '梯子',     shortDesc: '爬到顶端', pos: { x: 22, y: 30 },
      principle: { L1: '爬上去就能滑下来。', L2: '人爬升做功增加重力势能。', L3: '势能转化为下滑动能。' },
      kps: ['kp-energy-cons', 'kp-gravity', 'kp-newton-2'] },
    { slug: 'sl-rail',    name: '扶手',     shortDesc: '防止摔倒的扶手', pos: { x: 28, y: 55 },
      principle: { L1: '扶手让小朋友不摔下去。', L2: '提供支点保持身体平衡。', L3: '扶手高度按人体工学设计。' },
      kps: ['kp-gravity', 'kp-pressure', 'kp-friction'] },
    { slug: 'sl-curve',   name: '弯道',     shortDesc: '弯曲的滑梯部分', pos: { x: 75, y: 45 },
      principle: { L1: '滑道弯弯曲曲更刺激。', L2: '曲率改变方向需向心力。', L3: '弯道倾角减小侧向冲击。' },
      kps: ['kp-circular', 'kp-centripetal', 'kp-friction'] },
    { slug: 'sl-mat',     name: '终点垫',   shortDesc: '缓冲落地', pos: { x: 80, y: 80 },
      principle: { L1: '滑下来下面有软垫。', L2: '海绵延长接触时间减小冲击力。', L3: '冲量 = 力 × 时间。' },
      kps: ['kp-momentum', 'kp-elastic-collision', 'kp-polymer'] },
  ],
  'play-ferris': [
    { slug: 'fw-cabin',  name: '观光舱',   shortDesc: '乘客座舱', pos: { x: 50, y: 50 },
      principle: { L1: '坐在小屋里慢慢升上天。', L2: '车舱通过铰链保持地板水平。', L3: '重力始终把舱底拉向地心。' },
      kps: ['kp-circular', 'kp-gravity', 'kp-lever'] },
    { slug: 'fw-spoke',  name: '辐条',     shortDesc: '连接轴和外圈', pos: { x: 30, y: 35 },
      principle: { L1: '摩天轮辐条很多。', L2: '辐条把外圈重量传到中心轴。', L3: '张力 / 压力交替分布。' },
      kps: ['kp-pressure', 'kp-circular', 'kp-gravity'] },
    { slug: 'fw-motor',  name: '驱动电机', shortDesc: '让大轮缓慢转动', pos: { x: 70, y: 70 },
      principle: { L1: '摩天轮转得很慢。', L2: '大扭矩低速电机驱动主轴。', L3: '减速器把高速电机转换为大扭矩。' },
      kps: ['kp-motor', 'kp-electric-circuit', 'kp-circular'] },
    { slug: 'fw-view',   name: '俯瞰风景', shortDesc: '高视角的体验', pos: { x: 78, y: 22 },
      principle: { L1: '坐在最高能看很远。', L2: '高度让视野扩大、视角广阔。', L3: '地球曲率限制最大可见距离。' },
      kps: ['kp-refraction', 'kp-color-mixing', 'kp-weather'] },
    { slug: 'fw-light',  name: '夜间装饰灯', shortDesc: '炫目灯光', pos: { x: 20, y: 18 },
      principle: { L1: '晚上摩天轮亮起灯。', L2: 'LED 灯带跟随旋转发出彩色。', L3: 'DMX512 协议同步上千个灯点。' },
      kps: ['kp-led', 'kp-electric-circuit', 'kp-color-mixing'] },
  ],
  'play-bumper': [
    { slug: 'bp-car',     name: '碰碰车',   shortDesc: '撞来撞去的小车', pos: { x: 45, y: 55 },
      principle: { L1: '碰碰车互相撞着玩。', L2: '碰撞动量守恒、动能部分损耗。', L3: '橡胶围裙吸收冲击。' },
      kps: ['kp-momentum', 'kp-elastic-collision', 'kp-newton-2'] },
    { slug: 'bp-floor',   name: '导电地板', shortDesc: '通过地面供电', pos: { x: 50, y: 75 },
      principle: { L1: '碰碰车不要电池怎么会动？', L2: '车顶天线 + 导电地板形成回路。', L3: '安全低压（约 60V）直流系统。' },
      kps: ['kp-electric-circuit', 'kp-electromagnetism', 'kp-motor'] },
    { slug: 'bp-pole',    name: '导电杆',   shortDesc: '车顶接电的天线', pos: { x: 50, y: 28 },
      principle: { L1: '车顶上有一根杆。', L2: '杆顶接触天花板导电网。', L3: '弹簧滑接保证持续通电。' },
      kps: ['kp-electric-circuit', 'kp-friction', 'kp-em-wave'] },
    { slug: 'bp-rubber',  name: '橡胶护圈', shortDesc: '碰撞缓冲带', pos: { x: 75, y: 65 },
      principle: { L1: '车子周围一圈软软的。', L2: '橡胶弹性变形吸收能量。', L3: '邵氏硬度 60 平衡缓冲与回弹。' },
      kps: ['kp-elastic-collision', 'kp-polymer', 'kp-energy-cons'] },
    { slug: 'bp-light',   name: '车灯',     shortDesc: '装饰灯光', pos: { x: 25, y: 30 },
      principle: { L1: '碰碰车闪着彩灯。', L2: 'LED 让碰撞过程更具仪式感。', L3: '色温变化反映车速或状态。' },
      kps: ['kp-led', 'kp-color-mixing', 'kp-electric-circuit'] },
  ],
};

/* ────────────────────────────────────────────────────────────────
   入库逻辑
──────────────────────────────────────────────────────────────── */
async function main() {
  console.log('🏗  写入物品 + 知识点数据 v1 …\n');

  // 1) upsert 全部 KP
  let kpCnt = 0;
  for (const kp of KP_LIBRARY) {
    await prisma.knowledgePoint.upsert({
      where: { slug: kp.slug },
      update: {
        name: kp.name, subject: kp.subject, difficulty: kp.difficulty,
        summary: kp.summary, content: kp.summary, status: 'PUBLISHED',
      },
      create: {
        slug: kp.slug, name: kp.name, subject: kp.subject, difficulty: kp.difficulty,
        summary: kp.summary, content: kp.summary, status: 'PUBLISHED',
      },
    });
    kpCnt++;
  }
  console.log(`✔ ${kpCnt} 个 KP 已 upsert\n`);

  // 2) 处理每个 L2 → 物品
  let itemCnt = 0;
  let linkCnt = 0;
  for (const [sceneSlug, items] of Object.entries(L2_ITEMS)) {
    const scene = await prisma.scene.findUnique({ where: { slug: sceneSlug } });
    if (!scene) {
      console.warn(`⚠ scene ${sceneSlug} 不存在，跳过`);
      continue;
    }

    for (const it of items) {
      // upsert 物品
      const itemRec = await prisma.item.upsert({
        where: { slug: it.slug },
        update: {
          name: it.name,
          sceneId: scene.id,
          shortDesc: it.shortDesc,
          principleByLevel: it.principle,
          videoTitle: it.videoTitle ?? null,
          videoDurationSec: it.videoDurationSec ?? null,
          scenePosition: it.pos,
          status: 'PUBLISHED',
        },
        create: {
          slug: it.slug,
          name: it.name,
          sceneId: scene.id,
          shortDesc: it.shortDesc,
          principleByLevel: it.principle,
          videoTitle: it.videoTitle ?? null,
          videoDurationSec: it.videoDurationSec ?? null,
          scenePosition: it.pos,
          status: 'PUBLISHED',
        },
      });
      itemCnt++;

      // 关联 KP
      for (let i = 0; i < it.kps.length; i++) {
        const kpSlug = it.kps[i];
        const kp = await prisma.knowledgePoint.findUnique({ where: { slug: kpSlug } });
        if (!kp) {
          console.warn(`  ⚠ KP ${kpSlug} 不存在`);
          continue;
        }
        await prisma.itemKnowledgePoint.upsert({
          where: { itemId_knowledgePointId: { itemId: itemRec.id, knowledgePointId: kp.id } },
          update: { sortOrder: i },
          create: { itemId: itemRec.id, knowledgePointId: kp.id, sortOrder: i },
        });
        linkCnt++;
      }
    }
    console.log(`  ✔ [${sceneSlug}] ${items.length} 件物品`);
  }

  console.log(`\n📊 新增 ${itemCnt} 个物品 · ${linkCnt} 个物品-KP 关联`);

  // 3) 总览
  const total = await prisma.item.count({ where: { status: 'PUBLISHED' } });
  const sceneItem = await prisma.scene.findMany({
    where: { status: 'PUBLISHED', groupName: { not: '__l1' } },
    include: { _count: { select: { items: true } } },
    orderBy: [{ groupName: 'asc' }, { sortOrder: 'asc' }],
  });
  const lacking = sceneItem.filter(s => s._count.items < 5);
  console.log(`\n所有 PUBLISHED Item 总数：${total}`);
  if (lacking.length > 0) {
    console.log(`⚠ 以下 L2 场景物品不足 5 件：`);
    for (const s of lacking) console.log(`   [${s.groupName}] ${s.name}: ${s._count.items}`);
  } else {
    console.log(`✅ 所有 L2 场景物品数 ≥ 5`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
