/**
 * 数据修复脚本（走管理 API，幂等可重跑）
 *  1. unlockHint 脏数据清理："无"/空白 → null（修复厨房被锁 bug）
 *  2. 锁语义迁移：有有效 unlockHint 但 isLocked=false 的场景 → isLocked=true
 *     （配合用户端改为以 isLocked 判锁，保留原有锁定意图）
 *  3. 遗留 __l1 场景行：无挂载物品的软删归档
 *  4. world_map 设置：未配置时写入默认地图
 * 运行：npx ts-node --transpile-only --compilerOptions '{"module":"commonjs","moduleResolution":"node"}' scripts/fix-data.ts
 */
const BASE = 'http://localhost:3000/api/v1';

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

const isJunkHint = (h: string | null | undefined) =>
  h != null && ['无', '-', '—', 'none', 'null'].includes(h.trim().toLowerCase().replace(/\s/g, '')) || (h != null && h.trim() === '');

async function main() {
  const login = await api('/admin-auth/login', {
    method: 'POST', body: JSON.stringify({ username: 'admin', password: 'admin123456' }),
  });
  const token = login.body?.data?.accessToken;
  if (!token) throw new Error('登录失败');

  // ── 1+2: 场景 unlockHint / isLocked 规范化 ──
  const scenes = (await api('/admin/scenes', {}, token)).body?.data ?? [];
  for (const s of scenes) {
    if (s.groupName === '__l1') continue; // 遗留行走第 3 步
    let patch: any = null;
    if (isJunkHint(s.unlockHint)) {
      patch = { unlockHint: null };
      if (s.isLocked) patch.isLocked = true; // 锁定但提示是脏值 → 仅清提示
    } else if (s.unlockHint && !s.isLocked) {
      patch = { isLocked: true }; // 有有效提示但未标锁 → 补 isLocked
    }
    if (patch) {
      const r = await api(`/admin/scenes/${s.id}`, { method: 'PATCH', body: JSON.stringify(patch) }, token);
      console.log(`scene ${s.slug}: ${JSON.stringify(patch)} -> code=${r.body?.code}`);
    }
  }

  // 场景组同样规范化
  const groups = (await api('/admin/scene-groups', {}, token)).body?.data ?? [];
  for (const g of groups) {
    let patch: any = null;
    if (isJunkHint(g.unlockHint)) patch = { unlockHint: null };
    else if (g.unlockHint && !g.isLocked) patch = { isLocked: true };
    if (patch) {
      const r = await api(`/admin/scene-groups/${g.id}`, { method: 'PATCH', body: JSON.stringify(patch) }, token);
      console.log(`group ${g.slug}: ${JSON.stringify(patch)} -> code=${r.body?.code}`);
    }
  }

  // ── 3: __l1 遗留场景行清理 ──
  for (const s of scenes.filter((x: any) => x.groupName === '__l1')) {
    const itemCount = s._count?.items ?? -1;
    if (itemCount === 0) {
      const r = await api(`/admin/scenes/${s.id}`, { method: 'DELETE' }, token);
      console.log(`__l1 ${s.slug}: 软删归档 -> code=${r.body?.code}`);
    } else {
      console.log(`__l1 ${s.slug}: 跳过（仍挂载 ${itemCount} 件物品，请人工确认）`);
    }
  }

  // ── 4: world_map 默认配置 ──
  const wm = (await api('/admin/settings/world_map', {}, token)).body?.data;
  if (!wm?.imageUrl) {
    const r = await api('/admin/settings/world_map', {
      method: 'PUT',
      body: JSON.stringify({ value: { imageUrl: '/uploads/home/map-v11.png', imagePrompt: '' } }),
    }, token);
    console.log(`world_map: 写入默认地图 -> code=${r.body?.code}`);
  } else {
    console.log(`world_map: 已配置 ${wm.imageUrl}，跳过`);
  }

  // ── 验证 ──
  const pub = await api('/scenes');
  const l1Left = (pub.body?.data ?? []).filter((s: any) => s.groupName === '__l1').length;
  const junk = (pub.body?.data ?? []).filter((s: any) => isJunkHint(s.unlockHint)).length;
  const mismatch = (pub.body?.data ?? []).filter((s: any) => !!s.unlockHint !== !!s.isLocked).length;
  const wmPub = await api('/world-map');
  console.log('\n验证: __l1剩余=%d 脏hint=%d hint/isLocked不一致=%d world_map=%s',
    l1Left, junk, mismatch, JSON.stringify(wmPub.body?.data));
  const stats = await api('/stats');
  console.log('stats:', JSON.stringify(stats.body?.data));
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
