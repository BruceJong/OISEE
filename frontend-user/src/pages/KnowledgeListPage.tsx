import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { contentApi } from '@/api/content';
import { Pagination } from '@/components/Pagination';

const PAGE_SIZE = 20;

const userLevel = 'L2';
const ORDER: Record<string, number> = { L1: 1, L2: 2, L3: 3 };

export function KnowledgeListPage() {
  const [view, setView] = useState<'cards' | 'network'>('cards');
  const [filters, setFilters] = useState({
    subjects: new Set<string>(),
    levels: new Set<string>(),
    q: '',
    sort: 'default',
  });

  const { data: knowledge = [], isLoading } = useQuery({
    queryKey: ['public', 'kps'],
    queryFn: () => contentApi.knowledgeList({}),
  });

  const subjects = [...new Set(knowledge.map(k => k.subject))];

  const filtered = useMemo(() => {
    let list = knowledge.filter(k => {
      if (filters.subjects.size && !filters.subjects.has(k.subject)) return false;
      if (filters.levels.size && !filters.levels.has(k.difficulty)) return false;
      if (filters.q && !k.name.includes(filters.q) && !(k as any).desc?.includes(filters.q)) return false;
      return true;
    });
    if (filters.sort === 'level-asc') list = [...list].sort((a, b) => (ORDER[a.difficulty] ?? 0) - (ORDER[b.difficulty] ?? 0));
    if (filters.sort === 'level-desc') list = [...list].sort((a, b) => (ORDER[b.difficulty] ?? 0) - (ORDER[a.difficulty] ?? 0));
    if (filters.sort === 'subject') list = [...list].sort((a, b) => a.subject.localeCompare(b.subject));
    return list;
  }, [knowledge, filters]);

  /* ── 分页 ────────────────────────────────────────────────── */
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [filters.subjects, filters.levels, filters.q, filters.sort]);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSet(key: 'subjects' | 'levels', val: string) {
    setFilters(f => {
      const next = new Set(f[key]);
      next.has(val) ? next.delete(val) : next.add(val);
      return { ...f, [key]: next };
    });
  }

  function reset() {
    setFilters({ subjects: new Set(), levels: new Set(), q: '', sort: 'default' });
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <div className="eyebrow">／  知识探索</div>
          <h1 style={{ marginTop: 14 }}>所有知识点，<br/>排成一张地图。</h1>
          <p className="lead" style={{ marginTop: 14, maxWidth: 640 }}>
            用卡片库找具体知识点，或者切换到网络视图看它们之间的联系。
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4, border: '1px solid var(--hairline)', borderRadius: 999, padding: 4 }}>
          <button onClick={() => setView('cards')} style={viewBtn(view === 'cards')}>卡片库</button>
          <button onClick={() => setView('network')} style={viewBtn(view === 'network')}>知识网络</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 40, alignItems: 'flex-start' }}>
        {/* 侧边筛选 */}
        <aside style={{ position: 'sticky', top: 96, alignSelf: 'flex-start' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
            <h4 style={{ fontSize: 16 }}>筛选</h4>
            <button onClick={reset} style={{ background: 'transparent', border: 'none', color: 'var(--ink-3)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>重置</button>
          </div>

          <FilterGroup title="搜索">
            <div style={{ padding: '10px 12px', border: '1px solid var(--hairline)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>
              <input className="field" value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} placeholder="搜索知识点..." style={{ fontSize: 13 }}/>
            </div>
          </FilterGroup>

          <FilterGroup title="学科">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {subjects.map(s => (
                <Check key={s} label={s} count={knowledge.filter(k => k.subject === s).length}
                  checked={filters.subjects.has(s)} onChange={() => toggleSet('subjects', s)}/>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="难度">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['L1','L2','L3'].map(l => (
                <Check key={l} label={`${l} · ${{L1:'启蒙',L2:'探索',L3:'深化'}[l]}`}
                  count={knowledge.filter(k => k.difficulty === l).length}
                  checked={filters.levels.has(l)} onChange={() => toggleSet('levels', l)}/>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="排序">
            <select value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--hairline)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: 'var(--paper)', outline: 'none' }}>
              <option value="default">默认</option>
              <option value="level-asc">难度从低到高</option>
              <option value="level-desc">难度从高到低</option>
              <option value="subject">按学科</option>
            </select>
          </FilterGroup>
        </aside>

        {/* 主区 */}
        <main>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
            <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 2 }}>
              {isLoading ? '加载中...' : `${filtered.length} / ${knowledge.length} 个知识点`}
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[...filters.subjects].map(s => (
                <span key={s} className="tag" style={{ cursor: 'pointer' }} onClick={() => toggleSet('subjects', s)}>{s} ×</span>
              ))}
              {[...filters.levels].map(l => (
                <span key={l} className={`tag ${l}`} style={{ cursor: 'pointer' }} onClick={() => toggleSet('levels', l)}>{l} ×</span>
              ))}
            </div>
          </div>

          {view === 'cards' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                {paged.map(k => <KnowledgeCard key={k.id} kp={k} />)}
              </div>
              <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
            </>
          ) : (
            <div className="placeholder" style={{ height: 400 }}>
              <div>
                <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 12 }}>🕸</div>
                <div>知识网络视图（即将上线）</div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function viewBtn(active: boolean): React.CSSProperties {
  return {
    padding: '8px 18px', borderRadius: 999,
    background: active ? 'var(--ink)' : 'transparent',
    color: active ? 'var(--paper)' : 'var(--ink-2)',
    border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  };
}

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

function Check({ label, count, checked, onChange }: { label: string; count?: number; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, padding: '2px 0', userSelect: 'none' }}>
      <span style={{ width: 16, height: 16, border: `1.5px solid ${checked ? 'var(--ink)' : 'var(--ink-4)'}`, background: checked ? 'var(--ink)' : 'transparent', borderRadius: 3, display: 'grid', placeItems: 'center', color: 'var(--paper)', flexShrink: 0 }}>
        {checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>}
      </span>
      <span style={{ flex: 1, color: 'var(--ink-2)' }}>{label}</span>
      {typeof count === 'number' && <span style={{ color: 'var(--ink-4)', fontSize: 12 }}>{count}</span>}
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }}/>
    </label>
  );
}

function KnowledgeCard({ kp }: { kp: any }) {
  const locked = (ORDER[kp.difficulty] ?? 0) > (ORDER[userLevel] ?? 0);
  const SUBJECT_COLOR: Record<string, string> = { PHYSICS: '#305FBE', CHEMISTRY: '#C95746', BIOLOGY: '#4A8662', GEOGRAPHY: '#8C6B2A', OTHER: '#6B4D8C' };
  const SUBJECT_ICON: Record<string, string> = { PHYSICS: '⚛', CHEMISTRY: '⚗', BIOLOGY: '🧬', GEOGRAPHY: '🌍', OTHER: '🔬' };
  const SUBJECT_LABEL: Record<string, string> = { PHYSICS: '物理', CHEMISTRY: '化学', BIOLOGY: '生物', GEOGRAPHY: '地理', OTHER: '其他' };
  const c = SUBJECT_COLOR[kp.subject] ?? '#305FBE';

  return (
    <Link
      to={`/knowledge/${kp.slug}`}
      state={{ backStack: [{ url: '/knowledge', label: '知识库' }] }}
      className={`card lift ${locked ? 'locked' : ''}`}
      style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit' }}>
      {/* 封面 —— 优先展示 illustrationUrl，缺图回退到学科 emoji */}
      <div style={{
        aspectRatio: '16/9',
        background: c + '18',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {kp.illustrationUrl ? (
          <img
            src={kp.illustrationUrl}
            alt={kp.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'grid', placeItems: 'center',
            fontSize: 52, opacity: 0.35,
          }}>{SUBJECT_ICON[kp.subject] ?? '🔬'}</div>
        )}

        {/* 4px 左色条（叠在图上方） */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: 4, height: '100%',
          background: c, zIndex: 3,
        }}/>

        {/* 难度徽章（分层在右上） */}
        <div className="font-mono" style={{
          position: 'absolute', top: 10, right: 12,
          zIndex: 3,
          padding: '4px 10px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: c,
          fontSize: 10, fontWeight: 700, letterSpacing: 1,
          boxShadow: '0 1px 5px rgba(14,26,51,0.10)',
          border: `1px solid ${c}33`,
        }}>
          {kp.difficulty}
        </div>
      </div>
      {/* 内容 */}
      <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className={`tag ${kp.difficulty}`}>{`${kp.difficulty} · ${{L1:'启蒙',L2:'探索',L3:'深化'}[kp.difficulty as string] ?? ''}`}</span>
          <span className="tag">{SUBJECT_LABEL[kp.subject] ?? kp.subject}</span>
        </div>
        <h4 style={{ margin: 0, fontSize: 18, lineHeight: 1.3 }}>{kp.name}</h4>
        {kp.summary && <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, flex: 1 }}>{kp.summary}</p>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--ink-3)', paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
          <span className="font-mono">查看详情</span><span>→</span>
        </div>
      </div>
    </Link>
  );
}
