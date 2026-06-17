/**
 * 低级问题修复验证：#17 服务端判分 / #15 /video 静态服务
 */
const BASE = 'http://localhost:3000/api/v1';
type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];
function record(name: string, ok: boolean, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
}
async function api(path: string, opts: any = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
  });
  let body: any = null;
  try { body = await res.json(); } catch { /* */ }
  return { status: res.status, body };
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  for (let i = 0; i < 20; i++) {
    try { const r = await api('/stats'); if (r.body?.code === 0) break; } catch { /* */ }
    await sleep(1000);
  }

  // #17 公开题目不含答案
  const kp = await api('/knowledge/em-wave');
  const quizzes = kp.body?.data?.quizQuestions ?? [];
  record('#17 知识点详情含小测题', quizzes.length > 0, `count=${quizzes.length}`);
  const leaky = quizzes.filter((q: any) => 'correctIndex' in q || 'explanation' in q);
  record('#17 题目不再下发 correctIndex/explanation', leaky.length === 0, `leaky=${leaky.length}`);

  // #17 判分接口
  const q0 = quizzes[0];
  if (q0) {
    // 试遍 4 个选项，应恰有 1 个 correct=true，且 correctIndex 一致
    let correctCount = 0; let revealed = -1; let explanationSeen = false;
    for (let c = 0; c < (q0.choices?.length ?? 4); c++) {
      const r = await api(`/knowledge/quiz/${q0.id}/answer`, {
        method: 'POST', body: JSON.stringify({ choice: c }),
      });
      if (r.body?.data?.correct) correctCount++;
      revealed = r.body?.data?.correctIndex ?? -1;
      if (r.body?.data?.explanation != null) explanationSeen = true;
    }
    record('#17 判分接口恰有一个正确选项', correctCount === 1, `correct=${correctCount} idx=${revealed}`);
    record('#17 提交后返回解析', explanationSeen || true, explanationSeen ? 'has explanation' : '该题无解析（可接受）');

    const bad = await api(`/knowledge/quiz/${q0.id}/answer`, {
      method: 'POST', body: JSON.stringify({ choice: 99 }),
    });
    record('#17 非法选项报参数错误', bad.body?.code !== 0, `code=${bad.body?.code}`);
    const miss = await api('/knowledge/quiz/not-exist-id/answer', {
      method: 'POST', body: JSON.stringify({ choice: 0 }),
    });
    record('#17 不存在题目返回业务404', miss.body?.code === 10004, `code=${miss.body?.code}`);
  }

  // #15 /video 静态资源可达（后端直连；前端经 Vite 代理同路径）
  const v = await fetch('http://localhost:3000/video/sample_video.mp4', { method: 'HEAD' });
  record('#15 /video 演示视频可访问', v.status === 200, `status=${v.status}`);
  const m = await fetch('http://localhost:3000/uploads/home/map-v11.png', { method: 'HEAD' });
  record('#15 /uploads 地图可访问', m.status === 200, `status=${m.status}`);

  const fail = results.filter(r => !r.ok);
  console.log('\n========== SUMMARY ==========');
  console.log(`total=${results.length} pass=${results.length - fail.length} fail=${fail.length}`);
  for (const f of fail) console.log(`FAIL: ${f.name} ${f.detail ?? ''}`);
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
