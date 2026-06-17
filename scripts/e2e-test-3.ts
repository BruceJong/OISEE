/**
 * OISee E2E 第三轮：修正 round2 中 groupName 超长导致的跳过项
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

async function main() {
  const login = await api('/admin-auth/login', {
    method: 'POST', body: JSON.stringify({ username: 'admin', password: 'admin123456' }),
  });
  const token = login.body?.data?.accessToken ?? '';
  if (!token) { record('登录', false); summary(); return; }

  const ts = Date.now().toString(36).slice(-4);
  let groupId = '', sceneId = '', scene2Id = '', itemId = '';

  // 创建 + 发布一级场景
  {
    const { body } = await api('/admin/scene-groups', {
      method: 'POST',
      body: JSON.stringify({ slug: `e2e-g-${ts}`, name: `E2E组${ts}`, mapPosition: { x: 50, y: 50 } }),
    }, token);
    groupId = body?.data?.id ?? '';
    record('创建一级场景', !!groupId, body?.message ?? '');
    if (groupId) await api(`/admin/scene-groups/${groupId}/publish`, { method: 'POST', body: '{}' }, token);
  }
  // 创建 + 发布两个二级场景（groupName 用短 slug ≤20 字符）
  for (const [i, holder] of [['a'], ['b']].entries()) {
    const { body } = await api('/admin/scenes', {
      method: 'POST',
      body: JSON.stringify({
        slug: `e2e-s${holder[0]}-${ts}`, name: `E2E场景${holder[0]}`,
        groupName: `e2e-g-${ts}`, sceneGroupId: groupId,
      }),
    }, token);
    const id = body?.data?.id ?? '';
    if (i === 0) sceneId = id; else scene2Id = id;
    record(`创建二级场景${holder[0]}`, !!id, body?.message ?? '');
    if (id) await api(`/admin/scenes/${id}/publish`, { method: 'POST', body: '{}' }, token);
  }
  // 确认用户端可见
  {
    const { body } = await api('/scenes');
    const vis = (body?.data ?? []).filter((s: any) => [sceneId, scene2Id].includes(s.id)).length;
    record('两个二级场景发布后用户端可见', vis === 2, `visible=${vis}`);
  }
  // 批量排序
  if (sceneId && scene2Id) {
    const r = await api('/admin/scenes/batch/sort-order', {
      method: 'PATCH',
      body: JSON.stringify({ items: [{ id: sceneId, sortOrder: 200 }, { id: scene2Id, sortOrder: 100 }] }),
    }, token);
    const list = await api(`/admin/scenes?keyword=e2e-s`, {}, token);
    const a = (list.body?.data ?? []).find((s: any) => s.id === sceneId);
    const b = (list.body?.data ?? []).find((s: any) => s.id === scene2Id);
    record('场景批量排序生效', r.body?.code === 0 && a?.sortOrder === 200 && b?.sortOrder === 100,
      `a=${a?.sortOrder} b=${b?.sortOrder}`);
  }
  // 物品布局
  if (sceneId) {
    const it = await api('/admin/items', {
      method: 'POST',
      body: JSON.stringify({ slug: `e2e-i-${ts}`, name: 'E2E物品', sceneId, shortDesc: 'x' }),
    }, token);
    itemId = it.body?.data?.id ?? '';
    if (itemId) {
      const r = await api(`/admin/scenes/${sceneId}/item-layouts`, {
        method: 'PATCH',
        body: JSON.stringify([{ itemId, x: 11, y: 22, width: 10, height: 12 }]),
      }, token);
      const detail = await api(`/admin/items/${itemId}`, {}, token);
      const sp = detail.body?.data?.scenePosition;
      record('物品布局批量保存生效', r.status < 400 && sp?.x === 11 && sp?.y === 22, JSON.stringify(sp));
    } else {
      record('物品布局批量保存生效', false, '物品创建失败 ' + JSON.stringify(it.body)?.slice(0, 100));
    }
  }
  // 孤儿场景：下架一级场景后，子场景在 /scenes 是否仍可见
  if (groupId) {
    await api(`/admin/scene-groups/${groupId}/archive`, { method: 'POST', body: '{}' }, token);
    const groups = await api('/scene-groups');
    record('一级场景下架后从用户端消失', !(groups.body?.data ?? []).some((g: any) => g.id === groupId));
    const scenes = await api('/scenes');
    const orphans = (scenes.body?.data ?? []).filter((s: any) => [sceneId, scene2Id].includes(s.id));
    record('【孤儿检测】组下架后子场景不应仍在 /scenes', orphans.length === 0,
      `仍可见 ${orphans.length} 个（用户地图上无入口，物品仓库/统计仍计入）`);
  }
  // 清理
  if (itemId) await api(`/admin/items/${itemId}`, { method: 'DELETE' }, token);
  if (sceneId) await api(`/admin/scenes/${sceneId}`, { method: 'DELETE' }, token);
  if (scene2Id) await api(`/admin/scenes/${scene2Id}`, { method: 'DELETE' }, token);
  if (groupId) await api(`/admin/scene-groups/${groupId}`, { method: 'DELETE' }, token);
  {
    const s = await api('/admin/scenes?keyword=e2e-', {}, token);
    const g = await api('/admin/scene-groups?keyword=e2e-', {}, token);
    const i = await api('/admin/items?keyword=e2e-', {}, token);
    record('清理无残留', (s.body?.data ?? []).length === 0 && (g.body?.data ?? []).length === 0 && (i.body?.data ?? []).length === 0,
      `scenes=${(s.body?.data ?? []).length} groups=${(g.body?.data ?? []).length} items=${(i.body?.data ?? []).length}`);
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
