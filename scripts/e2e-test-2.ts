/**
 * OISee E2E 第二轮：CMS 业务功能面补充测试
 * 运行：npx ts-node --transpile-only --compilerOptions '{"module":"commonjs","moduleResolution":"node"}' scripts/e2e-test-2.ts
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
  // 登录 + refresh 流
  const login = await api('/admin-auth/login', {
    method: 'POST', body: JSON.stringify({ username: 'admin', password: 'admin123456' }),
  });
  const token = login.body?.data?.accessToken ?? '';
  const refreshToken = login.body?.data?.refreshToken ?? '';
  record('登录返回 accessToken+refreshToken', !!token && !!refreshToken);
  if (refreshToken) {
    const r = await api('/admin-auth/refresh', {
      method: 'POST', body: JSON.stringify({ refreshToken }),
    });
    record('refresh token 换发新 token', !!r.body?.data?.accessToken, `code=${r.body?.code}`);
  }
  if (!token) { summary(); return; }

  // 管理列表筛选
  {
    const kw = await api('/admin/scenes?keyword=kitchen', {}, token);
    const ok = (kw.body?.data ?? []).every((s: any) => /kitchen/i.test(s.slug) || /kitchen/i.test(s.name));
    record('CMS 场景关键字筛选', ok && (kw.body?.data ?? []).length > 0, `count=${(kw.body?.data ?? []).length}`);
    const draft = await api('/admin/scenes?status=DRAFT', {}, token);
    record('CMS 场景状态筛选 DRAFT', (draft.body?.data ?? []).every((s: any) => s.status === 'DRAFT'),
      `count=${(draft.body?.data ?? []).length}`);
  }
  {
    const f = await api('/admin/knowledge-points?subject=PHYSICS&difficulty=L1', {}, token);
    const ok = (f.body?.data ?? []).every((k: any) => k.subject === 'PHYSICS' && k.difficulty === 'L1');
    record('CMS 知识点学科+难度筛选', ok, `count=${(f.body?.data ?? []).length}`);
  }

  // ── 场景组生命周期 + 用户端联动 ──
  const ts = Date.now().toString(36);
  let groupId = '';
  let sceneId = '';
  {
    const { body } = await api('/admin/scene-groups', {
      method: 'POST',
      body: JSON.stringify({
        slug: `e2e-test-group-${ts}`, name: `E2E组${ts}`,
        description: '测试用一级场景', mapPosition: { x: 50, y: 50, radius: 8 },
      }),
    }, token);
    groupId = body?.data?.id ?? '';
    record('CMS 创建一级场景', !!groupId, `code=${body?.code} ${body?.message ?? ''}`);
  }
  if (groupId) {
    const pubBefore = await api('/scene-groups');
    const visibleBefore = (pubBefore.body?.data ?? []).some((g: any) => g.id === groupId);
    record('草稿一级场景对用户端不可见', !visibleBefore);

    await api(`/admin/scene-groups/${groupId}/publish`, { method: 'POST', body: '{}' }, token);
    const pubAfter = await api('/scene-groups');
    record('发布后一级场景出现在用户端地图数据',
      (pubAfter.body?.data ?? []).some((g: any) => g.id === groupId));

    // 挂一个已发布二级场景
    const sc = await api('/admin/scenes', {
      method: 'POST',
      body: JSON.stringify({
        slug: `e2e-test-sc2-${ts}`, name: 'E2E子场景', groupName: `e2e-test-group-${ts}`,
        sceneGroupId: groupId,
      }),
    }, token);
    sceneId = sc.body?.data?.id ?? '';
    if (sceneId) await api(`/admin/scenes/${sceneId}/publish`, { method: 'POST', body: '{}' }, token);

    // 下架一级场景 → 其子场景在用户端 /scenes 是否仍可见（孤儿检测）
    await api(`/admin/scene-groups/${groupId}/archive`, { method: 'POST', body: '{}' }, token);
    const groupsAfter = await api('/scene-groups');
    const groupGone = !(groupsAfter.body?.data ?? []).some((g: any) => g.id === groupId);
    record('下架后一级场景从用户端消失', groupGone);
    const scenesAfter = await api('/scenes');
    const orphanVisible = (scenesAfter.body?.data ?? []).some((s: any) => s.id === sceneId);
    record('一级场景下架后其子场景不应仍对用户端可见（孤儿场景检测）', !orphanVisible,
      orphanVisible ? '子场景仍在 /scenes 返回中，但地图上无入口（孤儿）' : 'ok');
  }

  // ── 批量排序 ──
  {
    const list = await api('/admin/scenes?keyword=e2e-test', {}, token);
    const mine = (list.body?.data ?? []).filter((s: any) => s.slug.startsWith('e2e-test'));
    if (mine.length > 0) {
      const r = await api('/admin/scenes/batch/sort-order', {
        method: 'PATCH',
        body: JSON.stringify({ items: mine.map((s: any, i: number) => ({ id: s.id, sortOrder: 100 + i })) }),
      }, token);
      record('CMS 场景批量排序', r.body?.code === 0, `code=${r.body?.code}`);
    } else {
      record('CMS 场景批量排序', false, '无测试场景可排序');
    }
  }

  // ── 物品布局批量更新 ──
  if (sceneId) {
    const it = await api('/admin/items', {
      method: 'POST',
      body: JSON.stringify({ slug: `e2e-test-it2-${ts}`, name: 'E2E布局物品', sceneId, shortDesc: 'x' }),
    }, token);
    const itemId = it.body?.data?.id ?? '';
    if (itemId) {
      const r = await api(`/admin/scenes/${sceneId}/item-layouts`, {
        method: 'PATCH',
        body: JSON.stringify([{ itemId, x: 11, y: 22, width: 10, height: 12 }]),
      }, token);
      const detail = await api(`/admin/items/${itemId}`, {}, token);
      const sp = detail.body?.data?.scenePosition;
      record('CMS 场景内物品布局保存', r.status < 400 && sp?.x === 11 && sp?.y === 22,
        `scenePosition=${JSON.stringify(sp)}`);
      await api(`/admin/items/${itemId}`, { method: 'DELETE' }, token);
    } else {
      record('CMS 场景内物品布局保存', false, '物品创建失败 ' + JSON.stringify(it.body)?.slice(0, 80));
    }
  }

  // ── 物品-知识点关联重设 ──
  {
    const items = await api('/admin/items?keyword=microwave', {}, token);
    const mw = (items.body?.data ?? [])[0];
    if (mw) {
      const detail = await api(`/admin/items/${mw.id}`, {}, token);
      const currentKpIds = (detail.body?.data?.knowledgePoints ?? []).map((k: any) => k.knowledgePointId);
      const r = await api(`/admin/items/${mw.id}/knowledge-points`, {
        method: 'POST', body: JSON.stringify({ knowledgePointIds: currentKpIds }),
      }, token);
      record('CMS 物品-知识点关联重设（幂等回写）', r.body?.code === 0 && r.body?.data?.count === currentKpIds.length,
        `count=${r.body?.data?.count}`);
    }
  }

  // ── world_map 设置写读还原 ──
  {
    const before = await api('/admin/settings/world_map', {}, token);
    const orig = before.body?.data ?? null;
    const put = await api('/admin/settings/world_map', {
      method: 'PUT', body: JSON.stringify({ value: { imageUrl: '/uploads/home/map-v11.png', imagePrompt: 'e2e-test' } }),
    }, token);
    const pub = await api('/world-map');
    record('世界地图设置写入并在用户端生效', put.body?.code === 0 && pub.body?.data?.imageUrl === '/uploads/home/map-v11.png',
      `public=${JSON.stringify(pub.body?.data)?.slice(0, 80)}`);
    // 还原
    await api('/admin/settings/world_map', { method: 'PUT', body: JSON.stringify({ value: orig }) }, token);
    const restored = await api('/world-map');
    record('世界地图设置还原', JSON.stringify(restored.body?.data) === JSON.stringify(orig),
      `restored=${JSON.stringify(restored.body?.data)?.slice(0, 60)}`);
  }

  // ── AI 模板解析（无副作用） ──
  {
    const r = await api('/admin/ai-tasks/parse-template', {
      method: 'POST', body: JSON.stringify({ template: 'curl -d "{{prompt}} {{api_key}}"' }),
    }, token);
    const vars = r.body?.data?.variables ?? [];
    record('AI 调用模板变量解析', vars.includes('prompt') && vars.includes('api_key'), JSON.stringify(vars));
  }

  // ── 缺失的管理面确认 ──
  {
    const r = await api('/admin/experiments', {}, token);
    record('【确认缺口】实验无 CMS 管理 API', r.status === 404, `status=${r.status}`);
    const q = await api('/admin/quiz-questions', {}, token);
    record('【确认缺口】小测题无 CMS 管理 API', q.status === 404, `status=${q.status}`);
    const rel = await api('/admin/knowledge-relations', {}, token);
    record('【确认缺口】知识点关系无 CMS 管理 API', rel.status === 404, `status=${rel.status}`);
  }

  // ── 清理 ──
  if (sceneId) await api(`/admin/scenes/${sceneId}`, { method: 'DELETE' }, token);
  if (groupId) await api(`/admin/scene-groups/${groupId}`, { method: 'DELETE' }, token);
  {
    const g = await api('/admin/scene-groups?keyword=e2e-test', {}, token);
    const s = await api('/admin/scenes?keyword=e2e-test', {}, token);
    record('清理完成（管理端无残留 e2e-test 数据）',
      (g.body?.data ?? []).length === 0 && (s.body?.data ?? []).length === 0,
      `groups=${(g.body?.data ?? []).length} scenes=${(s.body?.data ?? []).length}`);
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
