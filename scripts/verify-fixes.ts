/**
 * 修复验证脚本：实验404 / 级联可见性 / 新管理API（实验、小测题、知识点关系）
 */
const BASE = 'http://localhost:3000/api/v1';
type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];
function record(name: string, ok: boolean, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
}
async function api(path: string, opts: any = {}, token?: string) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  let body: any = null;
  try { body = await res.json(); } catch { /* */ }
  return { status: res.status, body };
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  // 等待 node --watch 重启完成
  for (let i = 0; i < 20; i++) {
    try {
      const r = await api('/stats');
      if (r.body?.code === 0) break;
    } catch { /* */ }
    await sleep(1000);
  }

  // #4 实验 404
  {
    const { status, body } = await api('/public/experiments/not-exist-slug');
    record('#4 实验详情404（非500）', status !== 500 && body?.code === 10004, `status=${status} code=${body?.code}`);
  }

  const login = await api('/admin-auth/login', {
    method: 'POST', body: JSON.stringify({ username: 'admin', password: 'admin123456' }),
  });
  const token = login.body?.data?.accessToken ?? '';
  if (!token) { record('登录', false); return summary(); }

  // #9 级联可见性
  const ts = Date.now().toString(36).slice(-4);
  let groupId = '', sceneId = '', itemId = '';
  {
    const g = await api('/admin/scene-groups', {
      method: 'POST', body: JSON.stringify({ slug: `vf-g-${ts}`, name: `VF组${ts}` }),
    }, token);
    groupId = g.body?.data?.id ?? '';
    await api(`/admin/scene-groups/${groupId}/publish`, { method: 'POST', body: '{}' }, token);
    const s = await api('/admin/scenes', {
      method: 'POST',
      body: JSON.stringify({ slug: `vf-s-${ts}`, name: 'VF场景', groupName: `vf-g-${ts}`, sceneGroupId: groupId }),
    }, token);
    sceneId = s.body?.data?.id ?? '';
    await api(`/admin/scenes/${sceneId}/publish`, { method: 'POST', body: '{}' }, token);
    const it = await api('/admin/items', {
      method: 'POST', body: JSON.stringify({ slug: `vf-i-${ts}`, name: 'VF物品', sceneId, shortDesc: 'x' }),
    }, token);
    itemId = it.body?.data?.id ?? '';
    await api(`/admin/items/${itemId}/publish`, { method: 'POST', body: '{}' }, token);

    const before = await api('/scenes');
    const visBefore = (before.body?.data ?? []).some((x: any) => x.id === sceneId);
    const itemsBefore = await api('/items');
    const itemVisBefore = (itemsBefore.body?.data ?? []).some((x: any) => x.id === itemId);
    record('前置：发布后场景+物品可见', visBefore && itemVisBefore);

    await api(`/admin/scene-groups/${groupId}/archive`, { method: 'POST', body: '{}' }, token);
    const after = await api('/scenes');
    const visAfter = (after.body?.data ?? []).some((x: any) => x.id === sceneId);
    const itemsAfter = await api('/items');
    const itemVisAfter = (itemsAfter.body?.data ?? []).some((x: any) => x.id === itemId);
    const detailAfter = await api(`/scenes/vf-s-${ts}`);
    record('#9 组下架后子场景从 /scenes 消失', !visAfter);
    record('#9 组下架后场景详情 404', detailAfter.body?.code === 10004, `code=${detailAfter.body?.code}`);
    record('#9 组下架后物品从 /items 消失', !itemVisAfter);
  }

  // #5 实验管理 API
  let expId = '';
  {
    const kps = await api('/admin/knowledge-points?keyword=em-wave', {}, token);
    const kpId = (kps.body?.data ?? [])[0]?.id;
    const items = await api('/admin/items?keyword=microwave', {}, token);
    const linkItemId = (items.body?.data ?? [])[0]?.id;
    const c = await api('/admin/experiments', {
      method: 'POST',
      body: JSON.stringify({
        slug: `vf-exp-${ts}`, name: 'VF测试实验', difficulty: 'L1', durationMin: 5,
        description: '验证用实验', materialsHome: ['杯子', '水'],
        itemIds: linkItemId ? [linkItemId] : [], knowledgePointIds: kpId ? [kpId] : [],
      }),
    }, token);
    expId = c.body?.data?.id ?? '';
    record('#5 创建实验（含关联）', !!expId && (c.body?.data?.knowledgePoints ?? []).length === (kpId ? 1 : 0),
      `code=${c.body?.code} ${c.body?.message ?? ''}`);

    const draftPub = await api(`/public/experiments/vf-exp-${ts}`);
    record('#5 草稿实验用户端不可见', draftPub.body?.code === 10004);

    await api(`/admin/experiments/${expId}/publish`, { method: 'POST', body: '{}' }, token);
    const pub = await api(`/public/experiments/vf-exp-${ts}`);
    record('#5 发布后实验用户端可见', pub.body?.code === 0);

    const u = await api(`/admin/experiments/${expId}`, {
      method: 'PATCH', body: JSON.stringify({ name: 'VF实验改名', knowledgePointIds: [] }),
    }, token);
    record('#5 更新实验+重写关联', u.body?.code === 0 && u.body?.data?.name === 'VF实验改名'
      && (u.body?.data?.knowledgePoints ?? []).length === 0);

    const dup = await api('/admin/experiments', {
      method: 'POST',
      body: JSON.stringify({ slug: `vf-exp-${ts}`, name: 'dup', difficulty: 'L1', description: 'x' }),
    }, token);
    record('#5 实验重复slug业务报错', dup.body?.code === 30001, `code=${dup.body?.code}`);
  }

  // #6 小测题管理 API
  {
    const kps = await api('/admin/knowledge-points?keyword=em-wave', {}, token);
    const kpId = (kps.body?.data ?? [])[0]?.id;
    const before = await api(`/admin/knowledge-points/${kpId}/quiz-questions`, {}, token);
    const beforeCount = (before.body?.data ?? []).length;
    const c = await api(`/admin/knowledge-points/${kpId}/quiz-questions`, {
      method: 'POST',
      body: JSON.stringify({
        question: 'VF测试题？', choices: ['A', 'B', 'C', 'D'], correctIndex: 1, explanation: '测试', sortOrder: 99,
      }),
    }, token);
    const qid = c.body?.data?.id ?? '';
    record('#6 创建小测题', !!qid, `code=${c.body?.code}`);
    const u = await api(`/admin/quiz-questions/${qid}`, {
      method: 'PATCH', body: JSON.stringify({ correctIndex: 2 }),
    }, token);
    record('#6 更新小测题', u.body?.code === 0 && u.body?.data?.correctIndex === 2);
    const pubKp = await api('/knowledge/em-wave');
    const found = (pubKp.body?.data?.quizQuestions ?? []).some((q: any) => q.id === qid);
    record('#6 新题出现在用户端考考你', found);
    const d = await api(`/admin/quiz-questions/${qid}`, { method: 'DELETE' }, token);
    const after = await api(`/admin/knowledge-points/${kpId}/quiz-questions`, {}, token);
    record('#6 删除小测题', d.body?.code === 0 && (after.body?.data ?? []).length === beforeCount);
    const bad = await api(`/admin/knowledge-points/${kpId}/quiz-questions`, {
      method: 'POST', body: JSON.stringify({ question: 'x', choices: ['A'], correctIndex: 0 }),
    }, token);
    record('#6 选项数量校验（需4个）', bad.body?.code !== 0, `code=${bad.body?.code}`);
  }

  // #7 知识点关系管理 API
  {
    const kps = await api('/admin/knowledge-points?keyword=em-wave', {}, token);
    const kpId = (kps.body?.data ?? [])[0]?.id;
    const orig = await api(`/admin/knowledge-points/${kpId}/relations`, {}, token);
    const origIds = orig.body?.data?.relatedIds ?? [];
    record('#7 读取知识点关系', orig.body?.code === 0, `count=${origIds.length}`);
    // 重写为原值（幂等回写，不破坏现网数据）
    const w = await api(`/admin/knowledge-points/${kpId}/relations`, {
      method: 'PUT', body: JSON.stringify({ relatedIds: origIds }),
    }, token);
    const back = await api(`/admin/knowledge-points/${kpId}/relations`, {}, token);
    const same = JSON.stringify([...(back.body?.data?.relatedIds ?? [])].sort()) === JSON.stringify([...origIds].sort());
    record('#7 重写关系幂等回写', w.body?.code === 0 && same, `count=${back.body?.data?.relatedIds?.length}`);
    const net = await api('/knowledge/network');
    record('#7 知识网络仍正常', (net.body?.data?.nodes ?? []).length > 0 && (net.body?.data?.edges ?? []).length > 0,
      `nodes=${net.body?.data?.nodes?.length} edges=${net.body?.data?.edges?.length}`);
  }

  // 清理
  if (expId) await api(`/admin/experiments/${expId}`, { method: 'DELETE' }, token);
  if (itemId) await api(`/admin/items/${itemId}`, { method: 'DELETE' }, token);
  if (sceneId) await api(`/admin/scenes/${sceneId}`, { method: 'DELETE' }, token);
  if (groupId) await api(`/admin/scene-groups/${groupId}`, { method: 'DELETE' }, token);
  {
    const e = await api('/admin/experiments?keyword=vf-', {}, token);
    const s = await api('/admin/scenes?keyword=vf-', {}, token);
    record('清理无残留', (e.body?.data ?? []).length === 0 && (s.body?.data ?? []).length === 0);
  }
  summary();
}
function summary() {
  const fail = results.filter(r => !r.ok);
  console.log('\n========== SUMMARY ==========');
  console.log(`total=${results.length} pass=${results.length - fail.length} fail=${fail.length}`);
  for (const f of fail) console.log(`FAIL: ${f.name} ${f.detail ?? ''}`);
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
