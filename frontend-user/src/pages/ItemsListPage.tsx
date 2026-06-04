import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { contentApi, type PublicItem } from '@/api/content';
import { useProgress } from '@/utils/progress';
import { Pagination } from '@/components/Pagination';

const PAGE_SIZE = 20;

/* ────────────────────────────────────────────────────────────────
   一级场景表（与 ScenesMapPage 中 LOCATIONS 颜色保持一致）
──────────────────────────────────────────────────────────────── */
const L1_GROUPS: Record<string, { name: string; color: string; icon: string }> = {
  'loc-home':    { name: '我的家',  color: '#D89531', icon: '🏠' },
  park:          { name: '公园',    color: '#4A8662', icon: '🌳' },
  school:        { name: '学校',    color: '#305FBE', icon: '🏫' },
  hospital:      { name: '医院',    color: '#C95746', icon: '🏥' },
  supermarket:   { name: '超市',    color: '#D89531', icon: '🛒' },
  mall:          { name: '商场',    color: '#6B4D8C', icon: '🛍' },
  playground:    { name: '游乐场',  color: '#6B4D8C', icon: '🎡' },
};

type StatusFilter = 'all' | 'not-started' | 'in-progress' | 'done';

export function ItemsListPage() {
  const { calcItemProgress } = useProgress();

  const [filters, setFilters] = useState({
    l1: new Set<string>(),
    status: 'all' as StatusFilter,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['public', 'items'],
    queryFn: contentApi.items,
  });

  /* ── 过滤 ─────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    return items.filter((it: PublicItem) => {
      // 一级场景
      if (filters.l1.size && !filters.l1.has(it.scene.groupName)) return false;
      // 探索状态
      if (filters.status !== 'all') {
        const p = calcItemProgress(it as any);
        if (filters.status === 'not-started' && p > 0) return false;
        if (filters.status === 'in-progress' && (p === 0 || p >= 0.99)) return false;
        if (filters.status === 'done' && p < 0.99) return false;
      }
      return true;
    });
  }, [items, filters, calcItemProgress]);

  /* ── 分页 ─────────────────────────────────────────────── */
  const [page, setPage] = useState(1);
  // 过滤变化时回到第 1 页
  useEffect(() => { setPage(1); }, [filters.l1, filters.status]);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleL1(g: string) {
    setFilters(f => {
      const next = new Set(f.l1);
      next.has(g) ? next.delete(g) : next.add(g);
      return { ...f, l1: next };
    });
  }
  function reset() {
    setFilters({ l1: new Set(), status: 'all' });
  }

  return (
    <div className="page">
      {/* 页眉（与知识探索同款） */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <div className="eyebrow">／  物品仓库</div>
          <h1 style={{ marginTop: 14 }}>所有物品，<br />一张张地摊开来看。</h1>
          <p className="lead" style={{ marginTop: 14, maxWidth: 640 }}>
            按一级场景或探索状态筛选所有物品；点开任意一件，看见它背后的原理与知识点。
          </p>
        </div>
        <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 2 }}>
          ITEMS LIBRARY
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 40, alignItems: 'flex-start' }}>
        {/* ── 侧边筛选 ── */}
        <aside style={{ position: 'sticky', top: 96, alignSelf: 'flex-start' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
            <h4 style={{ fontSize: 16 }}>筛选</h4>
            <button onClick={reset} style={{ background: 'transparent', border: 'none', color: 'var(--ink-3)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
              重置
            </button>
          </div>

          <FilterGroup title="一级场景">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(L1_GROUPS).map(([g, info]) => (
                <Check
                  key={g}
                  label={`${info.icon}  ${info.name}`}
                  color={info.color}
                  count={items.filter(it => it.scene.groupName === g).length}
                  checked={filters.l1.has(g)}
                  onChange={() => toggleL1(g)}
                />
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="探索状态">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {([
                { v: 'all',          l: '全部' },
                { v: 'not-started',  l: '未开始' },
                { v: 'in-progress',  l: '进行中' },
                { v: 'done',         l: '已完成' },
              ] as Array<{ v: StatusFilter; l: string }>).map(o => {
                const cnt = o.v === 'all'
                  ? items.length
                  : items.filter(it => {
                      const p = calcItemProgress(it as any);
                      if (o.v === 'not-started') return p === 0;
                      if (o.v === 'done')        return p >= 0.99;
                      return p > 0 && p < 0.99;
                    }).length;
                return (
                  <label key={o.v} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, padding: '2px 0', userSelect: 'none' }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${filters.status === o.v ? 'var(--ink)' : 'var(--ink-4)'}`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      {filters.status === o.v && <span style={{ width: 7, height: 7, background: 'var(--ink)', borderRadius: '50%' }}/>}
                    </span>
                    <span style={{ flex: 1, color: 'var(--ink-2)' }}>{o.l}</span>
                    <span style={{ color: 'var(--ink-4)', fontSize: 12 }}>{cnt}</span>
                    <input type="radio" name="status" checked={filters.status === o.v} onChange={() => setFilters(f => ({ ...f, status: o.v }))} style={{ display: 'none' }}/>
                  </label>
                );
              })}
            </div>
          </FilterGroup>
        </aside>

        {/* ── 主区 ── */}
        <main>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
            <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 2 }}>
              {isLoading ? '加载中...' : `${filtered.length} / ${items.length} 个物品`}
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[...filters.l1].map(g => (
                <span key={g} className="tag" style={{ cursor: 'pointer' }} onClick={() => toggleL1(g)}>
                  {L1_GROUPS[g]?.name ?? g} ×
                </span>
              ))}
              {filters.status !== 'all' && (
                <span className="tag" style={{ cursor: 'pointer' }} onClick={() => setFilters(f => ({ ...f, status: 'all' }))}>
                  {filters.status === 'not-started' ? '未开始' : filters.status === 'in-progress' ? '进行中' : '已完成'} ×
                </span>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="placeholder" style={{ height: 320 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 10 }}>🔍</div>
                <div>没有符合条件的物品</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                {paged.map(it => <ItemCard key={it.id} item={it} />)}
              </div>
              <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   通用组件
──────────────────────────────────────────────────────────────── */
function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ paddingBottom: 22, marginBottom: 22, borderBottom: '1px solid var(--hairline)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: 2, color: 'var(--ink-3)', marginBottom: 12 }}>
        {title.toUpperCase()}
      </div>
      {children}
    </div>
  );
}

function Check({ label, count, checked, onChange, color }: {
  label: string; count?: number; checked: boolean; onChange: () => void; color?: string;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, padding: '2px 0', userSelect: 'none' }}>
      <span style={{ width: 16, height: 16, border: `1.5px solid ${checked ? (color ?? 'var(--ink)') : 'var(--ink-4)'}`, background: checked ? (color ?? 'var(--ink)') : 'transparent', borderRadius: 3, display: 'grid', placeItems: 'center', color: 'var(--paper)', flexShrink: 0 }}>
        {checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>}
      </span>
      <span style={{ flex: 1, color: 'var(--ink-2)' }}>{label}</span>
      {typeof count === 'number' && <span style={{ color: 'var(--ink-4)', fontSize: 12 }}>{count}</span>}
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }}/>
    </label>
  );
}

/* ────────────────────────────────────────────────────────────────
   物品卡片
   布局完全对齐 KnowledgeListPage 中的 KnowledgeCard：
   - card lift  外框
   - aspect 16/9 封面 + 4px 左侧色条
   - 封面右下：场景名（mono）
   - 封面右上：探索度小徽章
   - 内容：物品名 + 简介 + 底部 "查看详情 →"
   - 上方有探索度迷你进度条
──────────────────────────────────────────────────────────────── */
function ItemCard({ item }: { item: PublicItem }) {
  const { calcItemProgress } = useProgress();
  const prog = calcItemProgress(item as any);
  const pct = Math.round(prog * 100);
  const done = prog >= 0.99;
  const l1 = L1_GROUPS[item.scene.groupName];
  const c = l1?.color ?? '#305FBE';

  return (
    <Link
      to={`/items/${item.slug}`}
      state={{ backStack: [{ url: '/items', label: '物品仓库' }] }}
      className="card lift"
      style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit' }}
    >
      {/* 封面 —— 3:2 满铺图，标签层叠在上方 */}
      <div style={{
        aspectRatio: '3 / 2',
        position: 'relative',
        overflow: 'hidden',
        background: c + '10',
      }}>
        {item.itemImageUrl ? (
          <img
            src={item.itemImageUrl}
            alt={item.name}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',          // 满铺，不留白
              display: 'block',
            }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 56, opacity: 0.35,
          }}>{l1?.icon ?? '🔧'}</div>
        )}

        {/* 4px 左色条（z 层最高，永远可见） */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: 4, height: '100%',
          background: c,
          zIndex: 3,
        }}/>

        {/* 左上：场景路径胶囊（玻璃毛拟材质，与图片分层） */}
        <div className="font-mono" style={{
          position: 'absolute', top: 10, left: 14,
          zIndex: 3,
          padding: '4px 10px',
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: c,
          fontSize: 10, letterSpacing: 1.5, fontWeight: 700,
          borderRadius: 999,
          boxShadow: '0 1px 6px rgba(14,26,51,0.10)',
          border: `1px solid ${c}33`,
        }}>
          {l1?.name ?? item.scene.groupName} · {item.scene.name}
        </div>

        {/* 右上：探索度徽章 */}
        <div style={{
          position: 'absolute', top: 10, right: 12,
          zIndex: 3,
          padding: '4px 10px',
          borderRadius: 999,
          background: done ? 'var(--ink)' : 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: done ? 'var(--paper)' : 'var(--ink-2)',
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
          letterSpacing: 1,
          boxShadow: '0 1px 6px rgba(14,26,51,0.12)',
        }}>
          {done ? '✓ DONE' : `${pct}%`}
        </div>
      </div>

      {/* 内容 */}
      <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="tag" style={{ borderColor: c + '60', color: c, background: c + '12' }}>
            {l1?.name ?? item.scene.groupName}
          </span>
          <span className="tag">{item.scene.name}</span>
        </div>

        <h4 style={{ margin: 0, fontSize: 18, lineHeight: 1.3 }}>{item.name}</h4>

        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, flex: 1 }}>
          {item.shortDesc}
        </p>

        {/* 探索度迷你进度条 */}
        <div>
          <div style={{ height: 3, background: 'var(--hairline)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{
              width: `${pct}%`,
              height: '100%',
              background: done ? 'var(--L1)' : c,
              transition: 'width .4s ease',
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--ink-3)', paddingTop: 6, borderTop: '1px solid var(--hairline)' }}>
            <span className="font-mono">{item.knowledgePoints.length} KPS · 查看详情</span>
            <span>→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
