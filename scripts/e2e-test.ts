/**
 * OISee 端到端 API 测试脚本（仅本地 dev 环境）
 * 覆盖：公开内容 API、管理端认证、CMS CRUD + 发布流、内容端→用户端数据流
 * 运行：npx ts-node scripts/e2e-test.ts
 * 所有写入数据使用 e2e-test- 前缀，结束后自动清理（软删）。
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
  try { body = await res.json(); } catch { /* non-json */ }
  return { status: res.status, body };
}

async function main() {
  // ───────────── 1. 公开 API ─────────────
  {
    const { status, body } = await api('/stats');
    record('公开/stats', status === 200 && body?.code === 0 && body.data.scenes > 0,
      JSON.stringify(body?.data));
  }
  {
    const { body } = await api('/scene-groups');
    const groups = body?.data ?? [];
    record('公开/scene-groups 返回已发布一级场景', Array.isArray(groups) && groups.length > 0,
      `count=${groups.length} slugs=${groups.map((g: any) => g.slug).join(',')}`);
    const noPos = groups.filter((g: any) => !g.mapPosition);
    record('一级场景均配置了地图坐标', noPos.length === 0,
      noPos.length ? '缺坐标: ' + noPos.map((g: any) => g.slug).join(',') : 'all ok');
    (globalThis as any).__groups = groups;
  }
  {
    const { body } = await api('/world-map');
    record('公开/world-map 配置', !!body?.data?.imageUrl, JSON.stringify(body?.data)?.slice(0, 120));
  }
  {
    const { body } = await api('/scenes');
    const scenes = body?.data ?? [];
    const groups = (globalThis as any).__groups ?? [];
    const groupSlugs = new Set(groups.map((g: any) => g.slug));
    const l1Legacy = scenes.filter((s: any) => s.groupName === '__l1');
    record('公开/scenes 不应包含遗留 __l1 行', l1Legacy.length === 0,
      `__l1 rows=${l1Legacy.length} (${l1Legacy.map((s: any) => s.slug).join(',')})`);
    const orphan = scenes.filter((s: any) => s.groupName !== '__l1' && !groupSlugs.has(s.groupName));
    record('每个 L2 场景的 groupName 都能匹配到已发布一级场景', orphan.length === 0,
      orphan.length ? '孤儿场景: ' + orphan.map((s: any) => s.slug + '→' + s.groupName).join(',') : 'all ok');
    const badHint = scenes.filter((s: any) => !s.isLocked && s.unlockHint);
    record('未锁定场景不应有 unlockHint（用户端以 hint 判锁）', badHint.length === 0,
      badHint.length ? badHint.map((s: any) => `${s.slug}:"${s.unlockHint}"`).join(',') : 'all ok');
  }
  {
    const { body } = await api('/items');
    const items = body?.data ?? [];
    record('公开/items 物品仓库', items.length > 0, `count=${items.length}`);
    const noIcon = items.filter((i: any) => !i.itemImageUrl && !i.svgSymbolId);
    record('物品均有图片或 SVG 符号', noIcon.length === 0,
      noIcon.length ? `缺图 ${noIcon.length} 件，如 ${noIcon.slice(0, 5).map((i: any) => i.slug).join(',')}` : 'all ok');
  }
  {
    const { body } = await api('/knowledge/network');
    const nodes = body?.data?.nodes ?? [];
    const edges = body?.data?.edges ?? [];
    const ids = new Set(nodes.map((n: any) => n.id));
    const dangling = edges.filter((e: any) => !ids.has(e.fromId) || !ids.has(e.toId));
    record('知识网络节点/边', nodes.length > 0, `nodes=${nodes.length} edges=${edges.length}`);
    record('知识网络无悬空边（指向未发布 KP）', dangling.length === 0, `悬空边=${dangling.length}`);
  }
  {
    // 找一个有小测题的知识点
    const { body } = await api('/knowledge');
    const kps = body?.data ?? [];
    let quizKp: any = null;
    for (const kp of kps.slice(0, 30)) {
      const d = await api(`/knowledge/${kp.slug}`);
      if ((d.body?.data?.quizQuestions ?? []).length > 0) { quizKp = d.body.data; break; }
    }
    record('存在带「考考你」小测题的知识点', !!quizKp,
      quizKp ? `${quizKp.slug} 共${quizKp.quizQuestions.length}题` : '前30个KP均无小测题');
  }
  {
    const { status, body } = await api('/public/experiments/not-exist-slug');
    record('实验详情 404 错误形态（不应是 500）', status !== 500,
      `status=${status} body=${JSON.stringify(body)?.slice(0, 100)}`);
  }
  {
    const { status, body } = await api('/scenes/not-exist-slug');
    record('场景详情 404 错误形态', status !== 500 && body?.code !== 0, `status=${status} code=${body?.code}`);
  }

  // ───────────── 2. 管理端认证 ─────────────
  let token = '';
  {
    const { status, body } = await api('/admin-auth/login', {
      method: 'POST', body: JSON.stringify({ username: 'admin', password: 'wrong-password' }),
    });
    record('管理端错误密码应拒绝', body?.code !== 0 || status >= 400, `status=${status} code=${body?.code}`);
  }
  {
    const { status, body } = await api('/admin-auth/login', {
      method: 'POST', body: JSON.stringify({ username: 'admin', password: 'admin123456' }),
    });
    token = body?.data?.accessToken ?? '';
    record('管理端登录', !!token, `status=${status}`);
  }
  {
    const { status } = await api('/admin/scenes');
    record('未带 token 访问管理 API 应 401', status === 401, `status=${status}`);
  }
  if (!token) { summary(); return; }

  // ───────────── 3. CMS CRUD + 发布流（数据流打通验证）─────────────
  const ts = Date.now().toString(36);
  const sceneSlug = `e2e-test-scene-${ts}`;
  const itemSlug = `e2e-test-item-${ts}`;
  const kpSlug = `e2e-test-kp-${ts}`;
  let sceneId = '', itemId = '', kpId = '';

  // 3.1 创建二级场景（挂到第一个一级场景下）
  {
    const groups = (globalThis as any).__groups ?? [];
    const g = groups[0];
    const { status, body } = await api('/admin/scenes', {
      method: 'POST',
      body: JSON.stringify({
        slug: sceneSlug, name: 'E2E测试场景', groupName: g?.slug ?? 'loc-home',
        description: '自动化测试创建，将被清理', sceneGroupId: g?.id ?? null,
      }),
    }, token);
    sceneId = body?.data?.id ?? '';
    record('CMS 创建场景', !!sceneId, `status=${status} code=${body?.code} ${body?.message ?? ''}`);
  }
  // 3.2 重复 slug 应报业务错误
  {
    const { body } = await api('/admin/scenes', {
      method: 'POST',
      body: JSON.stringify({ slug: sceneSlug, name: '重复slug', groupName: 'loc-home' }),
    }, token);
    record('CMS 重复 slug 返回业务错误', body?.code !== 0, `code=${body?.code} msg=${body?.message}`);
  }
  // 3.3 草稿场景不应出现在用户端
  {
    const { body } = await api('/scenes');
    const found = (body?.data ?? []).some((s: any) => s.slug === sceneSlug);
    record('草稿场景对用户端不可见', !found);
  }
  // 3.4 发布场景 → 用户端可见
  if (sceneId) {
    await api(`/admin/scenes/${sceneId}/publish`, { method: 'POST', body: '{}' }, token);
    const { body } = await api('/scenes');
    const found = (body?.data ?? []).some((s: any) => s.slug === sceneSlug);
    record('发布后场景对用户端可见（数据流打通）', found);
  }
  // 3.5 创建物品（草稿）→ 发布 → 用户端场景详情可见
  if (sceneId) {
    const { body } = await api('/admin/items', {
      method: 'POST',
      body: JSON.stringify({
        slug: itemSlug, name: 'E2E测试物品', sceneId, shortDesc: '自动化测试物品',
        scenePosition: { x: 50, y: 50, width: 10, height: 10 },
      }),
    }, token);
    itemId = body?.data?.id ?? '';
    record('CMS 创建物品', !!itemId, `code=${body?.code} ${body?.message ?? ''}`);

    const draft = await api(`/scenes/${sceneSlug}`);
    const draftVisible = (draft.body?.data?.items ?? []).some((i: any) => i.slug === itemSlug);
    record('草稿物品对用户端不可见', !draftVisible);

    if (itemId) {
      await api(`/admin/items/${itemId}/publish`, { method: 'POST', body: '{}' }, token);
      const pub = await api(`/scenes/${sceneSlug}`);
      const pubVisible = (pub.body?.data?.items ?? []).some((i: any) => i.slug === itemSlug);
      record('发布后物品出现在用户端场景详情', pubVisible);
      const list = await api('/items');
      const inList = (list.body?.data ?? []).some((i: any) => i.slug === itemSlug);
      record('发布后物品出现在用户端物品仓库', inList);
    }
  }
  // 3.6 创建知识点并关联物品 → 发布 → 用户端联动
  if (itemId) {
    const { body } = await api('/admin/knowledge-points', {
      method: 'POST',
      body: JSON.stringify({
        slug: kpSlug, name: 'E2E测试知识点', subject: 'PHYSICS', difficulty: 'L1',
        summary: '测试摘要', content: '测试内容', itemIds: [itemId],
      }),
    }, token);
    kpId = body?.data?.id ?? '';
    record('CMS 创建知识点并关联物品', !!kpId, `code=${body?.code} ${body?.message ?? ''}`);

    if (kpId) {
      await api(`/admin/knowledge-points/${kpId}/publish`, { method: 'POST', body: '{}' }, token);
      const kpPub = await api(`/knowledge/${kpSlug}`);
      record('发布后知识点用户端可见', kpPub.body?.code === 0);
      const itemDetail = await api(`/items/${itemSlug}`);
      const kpLinked = (itemDetail.body?.data?.knowledgePoints ?? [])
        .some((k: any) => k.knowledgePoint?.slug === kpSlug);
      record('用户端物品详情联动显示新知识点', kpLinked);
      const kpsList = await api('/knowledge');
      record('知识库列表包含新知识点',
        (kpsList.body?.data ?? []).some((k: any) => k.slug === kpSlug));
    }
  }
  // 3.7 编辑传播：改物品名称 → 用户端反映
  if (itemId) {
    await api(`/admin/items/${itemId}`, {
      method: 'PATCH', body: JSON.stringify({ name: 'E2E测试物品-改名' }),
    }, token);
    const { body } = await api(`/items/${itemSlug}`);
    record('CMS 编辑物品名称传播到用户端', body?.data?.name === 'E2E测试物品-改名',
      `name=${body?.data?.name}`);
  }
  // 3.8 下架传播：archive 物品 → 用户端消失
  if (itemId) {
    await api(`/admin/items/${itemId}/archive`, { method: 'POST', body: '{}' }, token);
    const { body, status } = await api(`/items/${itemSlug}`);
    record('下架物品后用户端详情 404', body?.code !== 0, `status=${status} code=${body?.code}`);
  }
  // 3.9 媒体上传（1x1 PNG）
  {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64');
    const form = new FormData();
    form.append('file', new Blob([png], { type: 'image/png' }), 'e2e-test.png');
    const res = await fetch(BASE + '/admin/media/upload?purpose=e2e-test', {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
    });
    const body: any = await res.json().catch(() => null);
    const url = body?.data?.url ?? '';
    record('CMS 媒体上传', !!url, `url=${url}`);
    if (url) {
      const img = await fetch(url.startsWith('http') ? url : `http://localhost:3000${url}`);
      record('上传文件可被静态访问', img.status === 200, `status=${img.status}`);
    }
  }
  // 3.10 管理端设置读写
  {
    const { body } = await api('/admin/settings', {}, token);
    record('CMS 读取系统设置', body?.code === 0,
      `keys=${Object.keys(body?.data ?? {}).join(',').slice(0, 80)}`);
  }
  // 3.11 AI 任务列表（仅读）
  {
    const { body } = await api('/admin/ai-tasks', {}, token);
    record('CMS AI 任务列表', body?.code === 0, `count=${(body?.data?.items ?? body?.data ?? []).length ?? '?'}`);
  }
  // 3.12 场景组列表（含统计）
  {
    const { body } = await api('/admin/scene-groups', {}, token);
    record('CMS 一级场景列表', body?.code === 0 && (body?.data ?? []).length > 0,
      `count=${(body?.data ?? []).length}`);
  }

  // ───────────── 4. 清理 ─────────────
  if (kpId) await api(`/admin/knowledge-points/${kpId}`, { method: 'DELETE' }, token);
  if (itemId) await api(`/admin/items/${itemId}`, { method: 'DELETE' }, token);
  if (sceneId) await api(`/admin/scenes/${sceneId}`, { method: 'DELETE' }, token);
  {
    const { body } = await api('/scenes');
    const found = (body?.data ?? []).some((s: any) => s.slug === sceneSlug);
    record('清理：测试场景已从用户端移除', !found);
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
