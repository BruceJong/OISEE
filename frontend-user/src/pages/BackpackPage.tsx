import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const userLevel = 'L2';

// 静态模拟数据（匹配原型）
const USER = {
  name: '小航',
  avatarInitial: '航',
  ageBand: '10-13',
  difficulty: userLevel,
  points: 320,
  level: { num: 2, title: '观察员', current: 320, next: 500, prev: 200 },
  explored: {
    scenes: { done: 1, total: 7 },
    items: { done: 3, total: 24 },
    knowledge: { done: 7, total: 48 },
  },
  badges: [
    { id: 'kitchen-rookie', name: '厨房新手', kind: 'explore', icon: '🍳', got: true, desc: '完成厨房 1 个物品的 L1 知识点' },
    { id: 'physics-spark', name: '物理小火花', kind: 'subject', icon: '⚡', got: true, desc: '点亮 3 个物理知识点' },
    { id: 'first-lab', name: '初次试验', kind: 'lab', icon: '🧪', got: true, desc: '完成第一个动手实验' },
    { id: 'kitchen-master', name: '厨房小达人', kind: 'explore', icon: '👨‍🍳', got: false, desc: '完成厨房全部物品的 L1 知识点' },
    { id: 'chem-explorer', name: '化学探险家', kind: 'subject', icon: '🧬', got: false, desc: '点亮 10 个化学知识点' },
    { id: 'lab-junior', name: '初级实验家', kind: 'lab', icon: '🔬', got: false, desc: '完成 5 个实验' },
    { id: 'all-house', name: '全屋通', kind: 'explore', icon: '🏠', got: false, desc: '完成「家」全场景探索' },
    { id: 'lab-master', name: '实验大师', kind: 'lab', icon: '🏆', got: false, desc: '完成 20 个实验' },
  ],
};

type BadgeTab = 'all' | 'explore' | 'subject' | 'lab';

const KIND_MAP: Record<string, { label: string; en: string }> = {
  explore: { label: '探索类', en: 'EXPLORE' },
  subject: { label: '学科类', en: 'SUBJECT' },
  lab:     { label: '实验类', en: 'LABORATORY' },
};

export function BackpackPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState<BadgeTab>('all');

  const levelPct = (USER.level.current - USER.level.prev) / (USER.level.next - USER.level.prev);
  const filtered = tab === 'all' ? USER.badges : USER.badges.filter(b => b.kind === tab);

  return (
    <div>
      {/* 顶部：身份 */}
      <section style={{ background: 'var(--ink)', color: 'var(--paper)', position: 'relative', overflow: 'hidden' }}>
        <div className="blueprint-grid-dark" style={{ position: 'absolute', inset: 0, opacity: 0.6, pointerEvents: 'none' }}/>
        <div className="page" style={{ position: 'relative', paddingTop: 56, paddingBottom: 56 }}>
          <button onClick={() => nav('/')} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '8px 0', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
            <span>←</span> 回首页
          </button>
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 48, alignItems: 'center' }}>
            {/* 头像 */}
            <div style={{
              width: 120, height: 120, borderRadius: 999,
              background: 'var(--amber)', color: 'var(--ink)',
              display: 'grid', placeItems: 'center',
              fontSize: 48, fontWeight: 700, fontFamily: 'var(--font-display)',
            }}>
              {USER.avatarInitial}
            </div>
            {/* 中：姓名 + 进度 */}
            <div>
              <div className="eyebrow" style={{ color: 'var(--amber)' }}>／  我的书包 · MY BACKPACK</div>
              <h1 style={{ marginTop: 12, color: 'var(--paper)', fontSize: 56 }}>{USER.name}</h1>
              <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className="tag" style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.75)' }}>{USER.ageBand} 岁</span>
                <span className="tag" style={{ background: 'var(--amber)', borderColor: 'var(--amber)', color: 'var(--ink)' }}>难度 {USER.difficulty}</span>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>· Lv{USER.level.num} {USER.level.title}</span>
              </div>
              <div style={{ marginTop: 24, maxWidth: 520 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8, color: 'rgba(255,255,255,0.55)' }}>
                  <span>距离 Lv{USER.level.num + 1}</span>
                  <span className="font-mono">{USER.level.current} / {USER.level.next} pt</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.12)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${levelPct * 100}%`, height: '100%', background: 'var(--amber)', transition: 'width .5s ease' }}/>
                </div>
              </div>
            </div>
            {/* 右：积分 */}
            <div style={{ textAlign: 'right' }}>
              <div className="font-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>TOTAL POINTS</div>
              <div className="font-display" style={{ fontSize: 88, color: 'var(--amber)', lineHeight: 1 }}>{USER.points}</div>
            </div>
          </div>
        </div>
      </section>

      {/* 探索度三联 */}
      <section className="page" style={{ paddingTop: 80 }}>
        <div className="eyebrow">／  EXPLORATION · 探索度</div>
        <h2 style={{ marginTop: 14, fontSize: 36 }}>你已经走了这么远</h2>
        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, border: '1px solid var(--hairline)', background: 'var(--paper)' }}>
          <ExploreCell label="场景" en="SCENES" v={USER.explored.scenes} color="var(--blue)" first/>
          <ExploreCell label="物品" en="ITEMS" v={USER.explored.items} color="var(--coral)"/>
          <ExploreCell label="知识点" en="KNOWLEDGE" v={USER.explored.knowledge} color="var(--amber)"/>
        </div>
      </section>

      {/* 勋章墙 */}
      <section className="page" style={{ paddingTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <div className="eyebrow">／  BADGES · 勋章墙</div>
            <h2 style={{ marginTop: 14, fontSize: 36 }}>已获得 {USER.badges.filter(b => b.got).length} / {USER.badges.length}</h2>
          </div>
          <div style={{ display: 'flex', gap: 4, border: '1px solid var(--hairline)', borderRadius: 999, padding: 4 }}>
            <button onClick={() => setTab('all')} style={pillBtn(tab === 'all')}>全部</button>
            {(Object.entries(KIND_MAP) as [BadgeTab, { label: string; en: string }][]).map(([k, v]) => (
              <button key={k} onClick={() => setTab(k)} style={pillBtn(tab === k)}>{v.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {filtered.map(b => <BadgeCard key={b.id} b={b} kind={KIND_MAP[b.kind] ?? { label: '其他', en: 'OTHER' }}/>)}
        </div>
      </section>

      {/* 知识星图 */}
      <section className="page" style={{ paddingTop: 16 }}>
        <div className="eyebrow">／  CONSTELLATION · 知识星图</div>
        <h2 style={{ marginTop: 14, fontSize: 36 }}>已点亮 {USER.explored.knowledge.done} 颗星</h2>
        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 56, alignItems: 'center', padding: 48, background: 'var(--ink)', color: 'var(--paper)', borderRadius: 12 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, fontSize: 16 }}>
              每学完一个知识点，知识网络里就有一颗星会被点亮。继续探索，把整片宇宙点亮吧。
            </p>
            <button className="btn amber" style={{ marginTop: 28 }} onClick={() => nav('/knowledge')}>查看完整知识网络</button>
          </div>
          <Constellation done={USER.explored.knowledge.done} total={USER.explored.knowledge.total}/>
        </div>
      </section>
    </div>
  );
}

function ExploreCell({ label, en, v, color, first }: { label: string; en: string; v: { done: number; total: number }; color: string; first?: boolean }) {
  const pct = v.done / v.total;
  return (
    <div style={{ padding: 36, borderLeft: first ? 'none' : '1px solid var(--hairline)' }}>
      <div className="font-mono" style={{ fontSize: 11, color, letterSpacing: 2, fontWeight: 600 }}>{en}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
        <div className="font-display" style={{ fontSize: 64, lineHeight: 1, color: 'var(--ink)' }}>{v.done}</div>
        <div className="font-mono" style={{ fontSize: 16, color: 'var(--ink-3)' }}>/ {v.total}</div>
      </div>
      <div style={{ marginTop: 14, fontSize: 14, color: 'var(--ink-2)' }}>{label} · {Math.round(pct * 100)}%</div>
      <div style={{ marginTop: 12 }}>
        <div style={{ height: 4, background: 'var(--hairline)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${pct * 100}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .5s ease' }}/>
        </div>
      </div>
    </div>
  );
}

function pillBtn(active: boolean): React.CSSProperties {
  return {
    padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
    border: 'none', background: active ? 'var(--ink)' : 'transparent',
    color: active ? 'var(--paper)' : 'var(--ink-2)', cursor: 'pointer', fontFamily: 'inherit',
  };
}

function BadgeCard({ b, kind }: { b: typeof USER.badges[0]; kind: { label: string; en: string } }) {
  return (
    <div className={`card ${b.got ? '' : 'locked'}`} style={{ padding: 28, textAlign: 'center', position: 'relative' }}>
      <div style={{
        width: 88, height: 88, margin: '0 auto 16px',
        borderRadius: 999, background: b.got ? 'var(--amber)' : 'var(--bg-2)',
        border: `1px solid ${b.got ? 'var(--amber)' : 'var(--hairline)'}`,
        display: 'grid', placeItems: 'center', fontSize: 36, position: 'relative',
      }}>
        {b.icon}
      </div>
      <div className="font-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: 2, marginBottom: 4 }}>{kind.en}</div>
      <h4 style={{ fontSize: 16, marginBottom: 6 }}>{b.name}</h4>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6 }}>{b.desc}</p>
      {b.got && <div style={{ marginTop: 10, fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>✓ 已获得</div>}
    </div>
  );
}

function Constellation({ done, total }: { done: number; total: number }) {
  const stars = Array.from({ length: total }, (_, i) => {
    const angle = (i / total) * Math.PI * 2 + (i % 3) * 0.5;
    const r = 28 + (i % 7) * 4;
    return { x: 50 + Math.cos(angle) * r, y: 50 + Math.sin(angle) * r, lit: i < done };
  });
  return (
    <div style={{ position: 'relative', aspectRatio: '1.6 / 1', background: 'radial-gradient(circle at center, #1A2B4D 0%, #050A18 100%)', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* 中心星 */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        width: 24, height: 24, borderRadius: 999, background: 'var(--amber)',
        boxShadow: '0 0 32px var(--amber)',
      }}/>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%,-50%)',
          width: s.lit ? 8 : 4, height: s.lit ? 8 : 4, borderRadius: 999,
          background: s.lit ? 'var(--amber)' : 'rgba(255,255,255,0.18)',
          boxShadow: s.lit ? '0 0 12px var(--amber)' : 'none',
          animation: s.lit ? `pulse ${2 + (i % 3)}s ease-in-out infinite` : 'none',
        }}/>
      ))}
    </div>
  );
}
