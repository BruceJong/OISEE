import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { contentApi } from '@/api/content';
import { Pagination } from '@/components/Pagination';

const PAGE_SIZE = 20;

export function ExperimentsPage() {
  const nav = useNavigate();
  const [filters, setFilters] = useState({
    levels: new Set<string>(),
    materials: new Set<string>(),
    needParent: '全部',
    duration: '全部',
    q: '',
  });

  const { data: experiments = [], isLoading } = useQuery({
    queryKey: ['public', 'experiments'],
    queryFn: contentApi.experimentList,
  });

  const filtered = useMemo(() => experiments.filter(e => {
    if (filters.levels.size && !filters.levels.has(e.difficulty)) return false;
    if (filters.materials.size && !filters.materials.has(e.materialType ?? '')) return false;
    if (filters.needParent === '需要' && !e.needParent) return false;
    if (filters.needParent === '不需要' && e.needParent) return false;
    if (filters.duration === '<10 分钟' && e.durationMin >= 10) return false;
    if (filters.duration === '10-20 分钟' && (e.durationMin < 10 || e.durationMin > 20)) return false;
    if (filters.duration === '>20 分钟' && e.durationMin <= 20) return false;
    if (filters.q && !e.name.includes(filters.q) && !e.description?.includes(filters.q)) return false;
    return true;
  }), [experiments, filters]);

  /* ── 分页 ─────────────────────────────────────────────── */
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [filters.levels, filters.materials, filters.needParent, filters.duration, filters.q]);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggle(key: 'levels' | 'materials', val: string) {
    setFilters(f => {
      const next = new Set(f[key]);
      next.has(val) ? next.delete(val) : next.add(val);
      return { ...f, [key]: next };
    });
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <div className="eyebrow">／  动手实验</div>
          <h1 style={{ marginTop: 14 }}>看完原理，<br/>亲手做一次。</h1>
          <p className="lead" style={{ marginTop: 14, maxWidth: 640 }}>
            完成实验是积分权重最高的行为（+50 / 次）。继续，把屏幕里的知识变成屏幕外的体验。
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 2 }}>EXPERIMENTS</div>
          <div className="font-display" style={{ fontSize: 48, lineHeight: 1 }}>{experiments.length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 40, alignItems: 'flex-start' }}>
        {/* 侧边筛选 */}
        <aside style={{ position: 'sticky', top: 96, alignSelf: 'flex-start' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
            <h4 style={{ fontSize: 16 }}>筛选</h4>
            <button onClick={() => setFilters({ levels: new Set(), materials: new Set(), needParent: '全部', duration: '全部', q: '' })}
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-3)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>重置</button>
          </div>

          <FilterGroup title="搜索">
            <div style={{ padding: '10px 12px', border: '1px solid var(--hairline)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>
              <input className="field" value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} placeholder="搜索实验..." style={{ fontSize: 13 }}/>
            </div>
          </FilterGroup>

          <FilterGroup title="难度">
            {['L1','L2','L3'].map(l => (
              <Check key={l} label={`${l} · ${{L1:'启蒙',L2:'探索',L3:'深化'}[l]}`}
                count={experiments.filter(e => e.difficulty === l).length}
                checked={filters.levels.has(l)} onChange={() => toggle('levels', l)}/>
            ))}
          </FilterGroup>

          <FilterGroup title="所需材料">
            {['材料包','家用物品'].map(m => (
              <Check key={m} label={m} count={experiments.filter(e => e.materialType === m).length}
                checked={filters.materials.has(m)} onChange={() => toggle('materials', m)}/>
            ))}
          </FilterGroup>

          <FilterGroup title="家长陪同">
            {['全部','需要','不需要'].map(s => (
              <Radio key={s} label={s} checked={filters.needParent === s}
                onChange={() => setFilters(f => ({ ...f, needParent: s }))}/>
            ))}
          </FilterGroup>

          <FilterGroup title="预计时长">
            {['全部','<10 分钟','10-20 分钟','>20 分钟'].map(s => (
              <Radio key={s} label={s} checked={filters.duration === s}
                onChange={() => setFilters(f => ({ ...f, duration: s }))}/>
            ))}
          </FilterGroup>
        </aside>

        {/* 列表 */}
        <main>
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 2 }}>
              {isLoading ? '加载中...' : `${filtered.length} / ${experiments.length} 个实验`}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {paged.map(e => <ExperimentCard key={e.id} exp={e} onClick={() => nav(`/experiments/${e.slug}`)} />)}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
        </main>
      </div>
    </div>
  );
}

function ExperimentCard({ exp, onClick }: { exp: any; onClick: () => void }) {
  const PALETTE_DEFAULT = { bg: '#E2EBE0', fg: '#4A8662' };
  const palette: Record<string, { bg: string; fg: string }> = {
    L1: PALETTE_DEFAULT,
    L2: { bg: '#FBEBE3', fg: '#C95746' },
    L3: { bg: '#EDE5F1', fg: '#6B4D8C' },
  };
  const p = palette[exp.difficulty] ?? PALETTE_DEFAULT;
  return (
    <div className="card lift" onClick={onClick} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
      <div style={{ position: 'relative', aspectRatio: '16/10', background: p.bg, overflow: 'hidden' }}>
        {exp.coverUrl ? (
          <img src={exp.coverUrl} alt={exp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
        ) : (
          <svg viewBox="0 0 200 125" style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid slice">
            <g stroke={p.fg} strokeWidth="1.2" fill="none" opacity="0.7">
              <path d="M 88 30 L 88 60 L 70 100 Q 70 110 80 110 L 120 110 Q 130 110 130 100 L 112 60 L 112 30"/>
              <line x1="84" y1="30" x2="116" y2="30" strokeWidth="2"/>
              <path d="M 80 85 Q 100 80 120 85" strokeDasharray="3 3"/>
            </g>
            <g fill={p.fg} opacity="0.45">
              <circle cx="92" cy="95" r="2"/><circle cx="105" cy="98" r="1.5"/><circle cx="100" cy="92" r="1.2"/>
            </g>
          </svg>
        )}
        <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 6 }}>
          <span className={`tag ${exp.difficulty}`}>{`${exp.difficulty} · ${{L1:'启蒙',L2:'探索',L3:'深化'}[exp.difficulty as string]}`}</span>
        </div>
        {exp.materialType && (
          <div style={{ position: 'absolute', top: 14, right: 14 }}>
            <span className="tag">{exp.materialType}</span>
          </div>
        )}
      </div>
      <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h4 style={{ margin: 0, fontSize: 18, lineHeight: 1.3 }}>{exp.name}</h4>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, flex: 1 }}>{exp.description}</p>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-3)', paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
          <span>⏱ {exp.durationMin} 分钟</span>
          {exp.needParent && <span>👪 需家长</span>}
          <span style={{ marginLeft: 'auto' }}>查看 →</span>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ paddingBottom: 22, marginBottom: 22, borderBottom: '1px solid var(--hairline)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: 2, color: 'var(--ink-3)', marginBottom: 12 }}>
        {title.toUpperCase()}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

function Check({ label, count, checked, onChange }: { label: string; count?: number; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, userSelect: 'none' }}>
      <span style={{ width: 16, height: 16, border: `1.5px solid ${checked ? 'var(--ink)' : 'var(--ink-4)'}`, background: checked ? 'var(--ink)' : 'transparent', borderRadius: 3, display: 'grid', placeItems: 'center', color: 'var(--paper)', flexShrink: 0 }}>
        {checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>}
      </span>
      <span style={{ flex: 1, color: 'var(--ink-2)' }}>{label}</span>
      {typeof count === 'number' && <span style={{ color: 'var(--ink-4)', fontSize: 12 }}>{count}</span>}
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }}/>
    </label>
  );
}

function Radio({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, userSelect: 'none' }}>
      <span style={{ width: 14, height: 14, borderRadius: 999, border: `1.5px solid ${checked ? 'var(--ink)' : 'var(--ink-4)'}`, background: 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        {checked && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ink)', display: 'block' }}/>}
      </span>
      <span style={{ color: 'var(--ink-2)' }}>{label}</span>
      <input type="radio" checked={checked} onChange={onChange} style={{ display: 'none' }}/>
    </label>
  );
}
