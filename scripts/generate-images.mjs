/**
 * OISee 图片批量生成脚本
 * 使用阿里云百炼 (DashScope) API 生成所有 2.5D 插画
 *
 * 用法: node scripts/generate-images.mjs
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const UPLOAD_BASE = path.join(ROOT, 'data/uploads');

const API_KEY = 'sk-37419bc4742449a09fb2b54aa75e5db0';
const SUBMIT_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';
const TASK_URL_BASE = 'https://dashscope.aliyuncs.com/api/v1/tasks/';
const MODEL = 'wanx2.1-t2i-turbo';

// ============================================================
// 所有需要生成的图片
// ============================================================
const IMAGES = [
  // === 首页 Hero ===
  {
    key: 'hero/homepage-hero',
    size: '1440*800',
    prompt: '2.5D等轴测视角插画，温馨现代的厨房场景，包含冰箱、微波炉、电水壶、燃气灶，温暖的金黄色和蓝色调，卡通风格，精细可爱，游戏UI场景图，白色淡色背景，高质量，科学教育风格',
    promptEn: '2.5D isometric illustration, cozy modern kitchen scene, refrigerator microwave kettle gas stove, warm golden and blue tones, cartoon style, cute detailed, game UI scene, light background, high quality, science education style',
  },

  // === 场景封面 (scene cover) ===
  {
    key: 'scenes/kitchen-cover',
    size: '800*600',
    prompt: '2.5D等轴测视角卡通插画，温馨家庭厨房，木质橱柜、大理石台面，冰箱、微波炉、燃气灶、电水壶等电器，温暖橙黄色调，精细可爱风格，无人物，白色背景，高质量游戏场景图',
  },
  {
    key: 'scenes/living-cover',
    size: '800*600',
    prompt: '2.5D等轴测视角卡通插画，温馨现代客厅，沙发、电视机、茶几、落地灯，绿植装饰，温暖自然色调，精细可爱风格，无人物，白色背景，高质量游戏场景图',
  },
  {
    key: 'scenes/bathroom-cover',
    size: '800*600',
    prompt: '2.5D等轴测视角卡通插画，干净现代浴室，洗手台、马桶、淋浴间、镜子，蓝白色调，精细可爱风格，无人物，白色背景，高质量游戏场景图',
  },
  {
    key: 'scenes/school-cover',
    size: '800*600',
    prompt: '2.5D等轴测视角卡通插画，明亮整洁的学校教室，课桌椅、黑板、科学实验台、书架，绿色和黄色调，精细可爱风格，无人物，白色背景，高质量游戏场景图',
  },
  {
    key: 'scenes/park-cover',
    size: '800*600',
    prompt: '2.5D等轴测视角卡通插画，阳光明媚的城市公园，大树、草地、花朵、长椅、喷水池，绿色和蓝色调，精细可爱风格，无人物，白色背景，高质量游戏场景图',
  },
  {
    key: 'scenes/hospital-cover',
    size: '800*600',
    prompt: '2.5D等轴测视角卡通插画，现代医院诊室，医疗设备、检查台、药品柜，蓝白色调干净整洁，精细可爱风格，无人物，白色背景，高质量游戏场景图',
  },
  {
    key: 'scenes/mall-cover',
    size: '800*600',
    prompt: '2.5D等轴测视角卡通插画，现代商场内部，各种商店招牌、自动扶梯、中庭，暖色调热闹氛围，精细可爱风格，无人物，白色背景，高质量游戏场景图',
  },

  // === 场景大图 (2.5D scene image with item hotspots) ===
  {
    key: 'scenes/kitchen-scene',
    size: '1200*800',
    prompt: '2.5D等轴测视角精细插画，家庭厨房全景，厨房橱柜清晰可见，冰箱在左侧、微波炉在中间台面上、电水壶在右侧台面、燃气灶在中间、抽油烟机在上方，物品位置清晰易辨认，温暖橙黄色调，卡通精细风格，无人物，白色或淡灰背景，游戏场景图高质量',
  },
  {
    key: 'scenes/living-scene',
    size: '1200*800',
    prompt: '2.5D等轴测视角精细插画，家庭客厅全景，电视机在中央背景墙上、沙发在前方、空调在上方、台灯在茶几旁，物品位置清晰易辨认，温暖自然色调，卡通精细风格，无人物，白色或淡灰背景，游戏场景图高质量',
  },

  // === 物品图片 ===
  {
    key: 'items/microwave',
    size: '600*600',
    prompt: '2.5D等轴测视角卡通插画，现代家用微波炉，白色机身，数字显示屏，旋转按钮，透明玻璃门，内部可见转盘，温暖光照，精细可爱风格，纯白背景，游戏道具图高质量',
  },
  {
    key: 'items/fridge',
    size: '600*600',
    prompt: '2.5D等轴测视角卡通插画，现代家用冰箱，双开门设计，银白色机身，门上有水吧，精细可爱风格，纯白背景，游戏道具图高质量',
  },
  {
    key: 'items/kettle',
    size: '600*600',
    prompt: '2.5D等轴测视角卡通插画，现代家用电热水壶，不锈钢材质，圆润壶型，蒸汽飘出，底座托盘，精细可爱风格，纯白背景，游戏道具图高质量',
  },
  {
    key: 'items/stove',
    size: '600*600',
    prompt: '2.5D等轴测视角卡通插画，家用燃气灶，嵌入式双灶头，蓝色火焰燃烧，旋钮控制，精细可爱风格，纯白背景，游戏道具图高质量',
  },
  {
    key: 'items/knife',
    size: '600*600',
    prompt: '2.5D等轴测视角卡通插画，厨房菜刀，锋利银色刀刃，木质刀柄，放在砧板上，精细可爱风格，纯白背景，游戏道具图高质量',
  },
  {
    key: 'items/hood',
    size: '600*600',
    prompt: '2.5D等轴测视角卡通插画，家用抽油烟机，不锈钢材质，宽大集烟罩，触控按钮，精细可爱风格，纯白背景，游戏道具图高质量',
  },
  {
    key: 'items/tv',
    size: '600*600',
    prompt: '2.5D等轴测视角卡通插画，现代平板电视机，超薄边框，屏幕显示彩色画面，细脚支架，精细可爱风格，纯白背景，游戏道具图高质量',
  },

  // === 爆炸图 (exploded diagrams) ===
  {
    key: 'items/microwave-exploded',
    size: '1200*800',
    prompt: '科学教育风格微波炉爆炸拆解图，蓝图技术风格，清晰标注各零件：磁控管、波导管、加热腔体、玻璃转盘、控制面板，黑色或深蓝背景，白色或金色线条标注，精细技术插画风格，高质量',
  },
  {
    key: 'items/fridge-exploded',
    size: '1200*800',
    prompt: '科学教育风格冰箱爆炸拆解图，蓝图技术风格，清晰标注各零件：压缩机、冷凝器、蒸发器、冷藏室、冷冻室，黑色或深蓝背景，白色或金色线条标注，精细技术插画风格，高质量',
  },

  // === 知识点插画 ===
  {
    key: 'knowledge/em-wave',
    size: '800*600',
    prompt: '科学教育插画，电磁波谱示意图，从无线电波到伽马射线，彩色波形展示，标注微波、可见光、X射线等，蓝色科技风格，简洁现代，白色背景，高质量',
  },
  {
    key: 'knowledge/water-molecule',
    size: '800*600',
    prompt: '科学教育插画，水分子振动示意图，H2O分子结构，电磁波照射下分子旋转振动，热量产生，蓝色调，简洁现代科学风格，白色背景，高质量',
  },
  {
    key: 'knowledge/heat-transfer',
    size: '800*600',
    prompt: '科学教育插画，热传递三种方式：热传导、热对流、热辐射，分区域展示，红橙色暖调，箭头指示热流方向，简洁现代，白色背景，高质量',
  },
  {
    key: 'knowledge/resistance-heat',
    size: '800*600',
    prompt: '科学教育插画，焦耳定律电阻发热，电路图加热丝发红，Q=I²Rt公式标注，橙红色调，简洁现代科学风格，白色背景，高质量',
  },
  {
    key: 'knowledge/phase-change',
    size: '800*600',
    prompt: '科学教育插画，物态变化示意图，固态冰→液态水→气态水蒸气，箭头标注熔化蒸发液化凝固，蓝色渐变调，简洁现代，白色背景，高质量',
  },
  {
    key: 'knowledge/compressor',
    size: '800*600',
    prompt: '科学教育插画，压缩机工作原理，制冷循环示意图，压缩→冷凝→节流→蒸发，红蓝对比色表示热冷，简洁现代，白色背景，高质量',
  },
  {
    key: 'knowledge/combustion',
    size: '800*600',
    prompt: '科学教育插画，燃烧化学反应，燃料+氧气→CO2+H2O+热，火焰橙红色，化学方程式标注，蓝橙对比色，简洁现代，白色背景，高质量',
  },
  {
    key: 'knowledge/boiling-point',
    size: '800*600',
    prompt: '科学教育插画，水沸腾示意图，100摄氏度气泡产生，温度计显示，蒸汽上升，蓝色调，简洁现代，白色背景，高质量',
  },
  {
    key: 'knowledge/pressure',
    size: '800*600',
    prompt: '科学教育插画，压强原理，相同力作用于大面积和小面积对比，高跟鞋vs运动鞋，压力分布可视化，简洁现代，白色背景，高质量',
  },
  {
    key: 'knowledge/bernoulli',
    size: '800*600',
    prompt: '科学教育插画，伯努利原理，流管中流速与压强关系，飞机机翼升力原理，蓝色气流箭头，简洁现代，白色背景，高质量',
  },

  // === 实验插画 ===
  {
    key: 'experiments/marshmallow',
    size: '800*600',
    prompt: '儿童科学实验插画，棉花糖在微波炉里膨胀变大，对比前后大小，卡通可爱风格，暖色调，操作步骤清晰，白色背景，高质量',
  },
  {
    key: 'experiments/ice-salt',
    size: '800*600',
    prompt: '儿童科学实验插画，冰块加盐降温实验，温度计、冰块、盐罐，温度降低到零下，卡通可爱风格，蓝白色调，操作步骤清晰，白色背景，高质量',
  },
  {
    key: 'experiments/grape-plasma',
    size: '800*600',
    prompt: '儿童科学实验插画，微波炉中葡萄产生等离子体，等离子火花效果，警示安全符号，卡通风格但有趣，暖色调，白色背景，高质量',
  },
  {
    key: 'experiments/candle-cover',
    size: '800*600',
    prompt: '儿童科学实验插画，玻璃杯罩住蜡烛，火焰逐渐熄灭，氧气耗尽原理，卡通可爱风格，橙蓝对比，白色背景，高质量',
  },
  {
    key: 'experiments/paper-airplane',
    size: '800*600',
    prompt: '儿童科学实验插画，三种不同翼型纸飞机对比测试，飞行轨迹，气流示意，卡通可爱风格，蓝色调，白色背景，高质量',
  },
];

// ============================================================
// API 工具函数
// ============================================================
function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(dest); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function submitTask(prompt, size = '1024*1024') {
  const body = {
    model: MODEL,
    input: { prompt },
    parameters: {
      size,
      n: 1,
      style: '<auto>',
    },
  };

  const res = await request(SUBMIT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
  }, body);

  if (res.status !== 200 && res.status !== 202) {
    throw new Error(`Submit failed: ${res.status} ${JSON.stringify(res.data)}`);
  }

  const taskId = res.data?.output?.task_id;
  if (!taskId) throw new Error(`No task_id in response: ${JSON.stringify(res.data)}`);
  return taskId;
}

async function waitTask(taskId, maxWait = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await request(`${TASK_URL_BASE}${taskId}`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    });
    const status = res.data?.output?.task_status;
    if (status === 'SUCCEEDED') {
      const results = res.data?.output?.results;
      if (results?.[0]?.url) return results[0].url;
      throw new Error(`No URL in results: ${JSON.stringify(res.data)}`);
    }
    if (status === 'FAILED') {
      throw new Error(`Task failed: ${JSON.stringify(res.data?.output)}`);
    }
    process.stdout.write('.');
  }
  throw new Error(`Task timeout: ${taskId}`);
}

async function generateImage(imgDef) {
  const { key, size, prompt } = imgDef;
  const dir = path.join(UPLOAD_BASE, path.dirname(key));
  const filename = path.basename(key) + '.png';
  const dest = path.join(dir, filename);

  if (fs.existsSync(dest)) {
    console.log(`⏭ 跳过已存在: ${key}`);
    return `/uploads/${key}.png`;
  }

  fs.mkdirSync(dir, { recursive: true });
  console.log(`🎨 生成: ${key} (${size})`);

  try {
    const taskId = await submitTask(prompt, size);
    console.log(`  📋 Task: ${taskId}`);
    process.stdout.write('  等待');
    const imgUrl = await waitTask(taskId);
    console.log(` ✓`);
    await downloadFile(imgUrl, dest);
    console.log(`  💾 已保存: ${dest}`);
    return `/uploads/${key}.png`;
  } catch (err) {
    console.error(`  ❌ 失败: ${err.message}`);
    return null;
  }
}

// ============================================================
// 主函数：批量生成
// ============================================================
async function main() {
  console.log(`🚀 开始批量生成 ${IMAGES.length} 张图片...\n`);

  const results = {};

  // 分批处理，每批 3 个并发
  const BATCH_SIZE = 3;
  for (let i = 0; i < IMAGES.length; i += BATCH_SIZE) {
    const batch = IMAGES.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(generateImage));
    batch.forEach((img, j) => {
      results[img.key] = batchResults[j];
    });
    console.log(`\n✅ 批次 ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(IMAGES.length/BATCH_SIZE)} 完成\n`);
  }

  // 输出结果映射
  const outputPath = path.join(ROOT, 'scripts/generated-image-urls.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n📊 结果已保存至: ${outputPath}`);
  console.log('\n生成的 URL 映射:');
  Object.entries(results).forEach(([k, v]) => {
    console.log(`  ${k}: ${v || '❌ 失败'}`);
  });
}

main().catch(console.error);
