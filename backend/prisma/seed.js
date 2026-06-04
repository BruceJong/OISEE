"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Prisma Seed · MVP 闭环
 *
 * 灌入：
 *   1. 一个超级管理员账号（从 .env 读取）
 *   2. 一个示例场景"家-厨房" + 几个物品 + 几个知识点（仅 dev 环境）
 *
 * 用法：
 *   pnpm db:seed
 */
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
const prisma = new client_1.PrismaClient();
async function seedSystem() {
    const username = process.env.OISEE_SEED_SUPERADMIN_USERNAME ?? 'admin';
    const password = process.env.OISEE_SEED_SUPERADMIN_PASSWORD ?? 'admin123456';
    const passwordHash = await argon2.hash(password);
    const admin = await prisma.admin.upsert({
        where: { username },
        update: {},
        create: {
            username,
            passwordHash,
            role: 'superadmin',
        },
    });
    console.log(`✔ 超管账号：${admin.username} (id: ${admin.id})`);
}
async function seedDevContent() {
    // 厨房场景
    const kitchen = await prisma.scene.upsert({
        where: { slug: 'home-kitchen' },
        update: {},
        create: {
            slug: 'home-kitchen',
            name: '厨房',
            groupName: '家',
            description: '家里科学密度最高的地方——加热、制冷、燃烧、压力都在这里发生。',
            iconKind: 'home',
            themeColor: 'sun',
            isDefault: true,
            mapPosition: { x: 28, y: 56 },
            status: 'PUBLISHED',
            sortOrder: 0,
        },
    });
    console.log(`✔ 场景：${kitchen.name} (id: ${kitchen.id})`);
    // 客厅场景（用于多场景测试）
    const living = await prisma.scene.upsert({
        where: { slug: 'home-living' },
        update: {},
        create: {
            slug: 'home-living',
            name: '客厅',
            groupName: '家',
            description: '电器最集中的房间。',
            iconKind: 'home',
            themeColor: 'leaf',
            isDefault: false,
            mapPosition: { x: 16, y: 30 },
            status: 'PUBLISHED',
            sortOrder: 1,
        },
    });
    console.log(`✔ 场景：${living.name} (id: ${living.id})`);
    // 物品：微波炉
    const microwave = await prisma.item.upsert({
        where: { slug: 'microwave' },
        update: {},
        create: {
            slug: 'microwave',
            name: '微波炉',
            sceneId: kitchen.id,
            shortDesc: '发出看不见的「波」让食物变热',
            svgSymbolId: 'microwave',
            principleByLevel: {
                L1: '微波炉发出看不见的「波」让食物里的水动起来变热。',
                L2: '电磁波使水分子来回振动，分子间摩擦产生热量。',
                L3: '2.45GHz 微波驱动极性分子取向反复变化，介电损耗转化为热。',
            },
            videoTitle: '微波炉是怎么把食物加热的？',
            videoDurationSec: 222,
            scenePosition: { x: 30, y: 38, width: 12, height: 14 },
            status: 'PUBLISHED',
            sortOrder: 0,
        },
    });
    console.log(`✔ 物品：${microwave.name}`);
    // 物品：冰箱
    const fridge = await prisma.item.upsert({
        where: { slug: 'fridge' },
        update: {},
        create: {
            slug: 'fridge',
            name: '冰箱',
            sceneId: kitchen.id,
            shortDesc: '把热量「搬走」让里面变冷',
            svgSymbolId: 'fridge',
            principleByLevel: {
                L1: '冰箱把里面的热量「搬」到外面去，所以里面变冷。',
                L2: '压缩机循环压缩制冷剂，利用相变吸收热量。',
                L3: '逆卡诺循环：制冷剂在蒸发器吸热气化，冷凝器放热液化。',
            },
            scenePosition: { x: 12, y: 60, width: 14, height: 18 },
            status: 'PUBLISHED',
            sortOrder: 1,
        },
    });
    console.log(`✔ 物品：${fridge.name}`);
    // 物品：电水壶
    const kettle = await prisma.item.upsert({
        where: { slug: 'kettle' },
        update: {},
        create: {
            slug: 'kettle',
            name: '电水壶',
            sceneId: kitchen.id,
            shortDesc: '电流穿过电阻产生热',
            svgSymbolId: 'kettle',
            principleByLevel: {
                L1: '电流流过加热丝，加热丝就变热，把水煮开。',
                L2: '电流做功转化为热量（焦耳定律 Q=I²Rt）。',
                L3: '电阻发热效率取决于材料的电阻率与几何结构。',
            },
            scenePosition: { x: 70, y: 50, width: 10, height: 12 },
            status: 'PUBLISHED',
            sortOrder: 2,
        },
    });
    console.log(`✔ 物品：${kettle.name}`);
    // 知识点
    const kpEmWave = await prisma.knowledgePoint.upsert({
        where: { slug: 'em-wave' },
        update: {},
        create: {
            slug: 'em-wave',
            name: '电磁波是什么',
            subject: 'PHYSICS',
            difficulty: 'L1',
            summary: '看不见的能量波，无线电、光和微波都是它',
            content: '电磁波是由电场和磁场交替变化形成的波动，它不需要任何介质就能在真空中传播。\n\n你每天能用到的东西——手机信号、Wi-Fi、电视遥控器、太阳光、微波炉的"波"——都是电磁波，只是频率不同。',
            status: 'PUBLISHED',
        },
    });
    const kpWaterMolecule = await prisma.knowledgePoint.upsert({
        where: { slug: 'water-molecule' },
        update: {},
        create: {
            slug: 'water-molecule',
            name: '水分子的振动',
            subject: 'PHYSICS',
            difficulty: 'L2',
            summary: '微波让水分子来回振动，分子摩擦产生热量',
            content: '水分子（H₂O）是一个有"正负两端"的极性分子。当微波（电磁波的一种）穿过水时，电场方向每秒变化几十亿次，水分子也被迫跟着翻转。\n\n分子之间相互摩擦，把动能转化为热能——这就是微波炉加热食物的原理。',
            status: 'PUBLISHED',
        },
    });
    const kpHeatTransfer = await prisma.knowledgePoint.upsert({
        where: { slug: 'heat-transfer' },
        update: {},
        create: {
            slug: 'heat-transfer',
            name: '热的传递',
            subject: 'PHYSICS',
            difficulty: 'L1',
            summary: '热会从温度高的地方流向温度低的地方',
            content: '热量总是从高温物体传向低温物体，直到温度相等。传递方式有三种：传导、对流、辐射。',
            status: 'PUBLISHED',
        },
    });
    const kpResistance = await prisma.knowledgePoint.upsert({
        where: { slug: 'resistance-heat' },
        update: {},
        create: {
            slug: 'resistance-heat',
            name: '电流做功生热',
            subject: 'PHYSICS',
            difficulty: 'L1',
            summary: '电流穿过电阻就会发热——焦耳定律',
            content: '电流通过有电阻的物体时，电能会转化为热能。这就是焦耳定律：Q = I²Rt。\n\n电热水壶、电饭煲、电吹风——都是利用这个原理。',
            status: 'PUBLISHED',
        },
    });
    // 物品-知识点关联
    await prisma.itemKnowledgePoint.createMany({
        data: [
            { itemId: microwave.id, knowledgePointId: kpEmWave.id, sortOrder: 0 },
            { itemId: microwave.id, knowledgePointId: kpWaterMolecule.id, sortOrder: 1 },
            { itemId: fridge.id, knowledgePointId: kpHeatTransfer.id, sortOrder: 0 },
            { itemId: kettle.id, knowledgePointId: kpResistance.id, sortOrder: 0 },
            { itemId: kettle.id, knowledgePointId: kpHeatTransfer.id, sortOrder: 1 },
        ],
        skipDuplicates: true,
    });
    console.log(`✔ 物品-知识点关联`);
    // 知识网络关系
    await prisma.knowledgeRelation.createMany({
        data: [
            { fromId: kpEmWave.id, toId: kpWaterMolecule.id },
            { fromId: kpHeatTransfer.id, toId: kpResistance.id },
        ],
        skipDuplicates: true,
    });
    console.log(`✔ 知识网络关系`);
}
async function main() {
    console.log('🌱 开始 seed...');
    await seedSystem();
    if (process.env.OISEE_NODE_ENV !== 'production') {
        console.log('🌱 灌入开发环境示例内容...');
        await seedDevContent();
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
//# sourceMappingURL=seed.js.map