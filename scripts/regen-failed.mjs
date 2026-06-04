/**
 * 补生成失败的图片
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

const FAILED = [
  { key: 'hero/homepage-hero', size: '1440*800', prompt: '2.5D等轴测插画，温馨现代厨房，冰箱微波炉电水壶燃气灶，金黄蓝色调，卡通精细，游戏场景，浅色背景，高质量科教风格' },
  { key: 'scenes/kitchen-scene', size: '1200*800', prompt: '2.5D等轴测精细插画，家庭厨房全景，冰箱在左侧、微波炉台面中间、电水壶右侧台面、燃气灶中间、抽油烟机上方，橙黄色调，卡通精细，无人物，淡色背景，高质量游戏场景图' },
  { key: 'items/microwave', size: '600*600', prompt: '2.5D等轴测卡通插画，现代家用微波炉，白色机身数字显示屏旋转按钮透明玻璃门，温暖光照，精细可爱，纯白背景，游戏道具图高质量' },
  { key: 'items/tv', size: '600*600', prompt: '2.5D等轴测卡通插画，现代平板电视机，超薄边框，屏幕显示彩色画面，细脚支架，精细可爱，纯白背景，游戏道具图高质量' },
  { key: 'knowledge/phase-change', size: '800*600', prompt: '科学教育插画，物态变化图，固态冰液态水气态水蒸气，箭头标注熔化蒸发液化凝固，蓝色渐变，简洁现代，白色背景，高质量' },
  { key: 'knowledge/boiling-point', size: '800*600', prompt: '科学教育插画，水沸腾示意图，100摄氏度气泡产生，温度计显示，蒸汽上升，蓝色调，简洁现代，白色背景，高质量' },
  { key: 'experiments/marshmallow', size: '800*600', prompt: '儿童科学实验插画，棉花糖在微波炉里膨胀变大，对比前后大小，卡通可爱，暖色调，操作步骤清晰，白色背景，高质量' },
  { key: 'experiments/candle-cover', size: '800*600', prompt: '儿童科学实验插画，玻璃杯罩住蜡烛，火焰熄灭，氧气耗尽，卡通可爱，橙蓝对比，白色背景，高质量' },
];

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
    if (body) req.write(JSON.stringify(body));
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
    }).on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function submitTask(prompt, size) {
  const res = await request(SUBMIT_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json', 'X-DashScope-Async': 'enable' },
  }, { model: MODEL, input: { prompt }, parameters: { size, n: 1 } });

  if (res.status !== 200 && res.status !== 202) throw new Error(`Submit: ${res.status} ${JSON.stringify(res.data)}`);
  const taskId = res.data?.output?.task_id;
  if (!taskId) throw new Error(`No task_id: ${JSON.stringify(res.data)}`);
  return taskId;
}

async function waitTask(taskId) {
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await request(`${TASK_URL_BASE}${taskId}`, { headers: { 'Authorization': `Bearer ${API_KEY}` } });
    const status = res.data?.output?.task_status;
    if (status === 'SUCCEEDED') {
      const url = res.data?.output?.results?.[0]?.url;
      if (url) return url;
      throw new Error(`No URL: ${JSON.stringify(res.data)}`);
    }
    if (status === 'FAILED') throw new Error(`Failed: ${JSON.stringify(res.data?.output)}`);
    process.stdout.write('.');
  }
  throw new Error('Timeout');
}

async function gen(imgDef) {
  const { key, size, prompt } = imgDef;
  const dir = path.join(UPLOAD_BASE, path.dirname(key));
  const dest = path.join(dir, path.basename(key) + '.png');
  if (fs.existsSync(dest)) { console.log(`⏭ 跳过: ${key}`); return; }
  fs.mkdirSync(dir, { recursive: true });
  console.log(`🎨 ${key}`);
  try {
    const taskId = await submitTask(prompt, size);
    process.stdout.write(`  [${taskId.slice(0,8)}] `);
    const imgUrl = await waitTask(taskId);
    console.log(` ✓`);
    await downloadFile(imgUrl, dest);
    console.log(`  💾 ${dest}`);
  } catch (err) {
    console.error(`  ❌ ${err.message}`);
  }
}

async function main() {
  console.log(`补生成 ${FAILED.length} 张失败图片...\n`);
  for (let i = 0; i < FAILED.length; i += 2) {
    await Promise.all(FAILED.slice(i, i+2).map(gen));
    if (i + 2 < FAILED.length) await new Promise(r => setTimeout(r, 2000));
  }
  console.log('\n✅ 完成');
}
main().catch(console.error);
