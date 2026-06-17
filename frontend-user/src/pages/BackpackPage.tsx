import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { contentApi } from '@/api/content';
import { useProgress } from '@/utils/progress';
import { useQuizStore, getCompletedKpSlugs } from '@/utils/quiz-store';
import { useExperimentsStore } from '@/utils/experiments-store';
import { useUserLevel, type UserLevel } from '@/utils/user-level';
import { useAuth } from '@/utils/auth';
import { getAvatar } from '@/utils/avatars';
import { GRADE_STAGE_LABELS, type GradeStage } from '@oisee/shared';

/**
 * 我的书包 —— 全部数据来自真实进度（localStorage）+ 已发布内容
 * 积分规则：浏览知识点 ×10 · 小测满分 ×20 · 完成实验 ×50
 */
const POINTS = { kpViewed: 10, quizDone: 20, expDone: 50 };

const LEVELS = [
  { num: 1, title: '新手观察员', from: 0 },
  { num: 2, title: '观察员',     from: 100 },
  { num: 3, title: '探索者',     from: 300 },
  { num: 4, title: '研究员',     from: 600 },
  { num: 5, title: '小科学家',   from: 1000 },
  { num: 6, title: '科学大师',   from: 1600 },
];

const LEVEL_OPTIONS: Array<{ value: UserLevel; label: string; desc: string }> = [
  { value: 'L1', label: 'L1 启蒙', desc: '6-9 岁' },
  { value: 'L2', label: 'L2 探索', desc: '10-13 岁' },
  { value: 'L3', label: 'L3 深化', desc: '14-16 岁' },
];

type BadgeTab = 'all' | 'explore' | 'quiz' | 'lab';

const KIND_MAP: Record<string, { label: string; en: string }> = {
  explore: { label: '探索类', en: 'EXPLORE' },
  quiz:    { label: '答题类', en: 'QUIZ' },
  lab:     { label: '实验类', en: 'LABORATORY' },
};

export function BackpackPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState<BadgeTab>('all');

  const { user } = useAuth();
  const av = getAvatar(user?.avatar);
  const gradeLabel = user?.gradeStage ? GRADE_STAGE_LABELS[user.gradeStage as GradeStage] : null;
  const { level, setLevel } = useUserLevel();
  const { calcItemProgress, calcSceneProgress, getStore } = useProgress();
  useQuizStore();                 // 订阅小测变化
  const { getDoneExperimentSlugs } = useExperimentsStore();

  const { data: scenes = [] } = useQuery({ queryKey: ['public', 'scenes'], queryFn: contentApi.scenes });
  const { data: items = [] }  = useQuery({ queryKey: ['public', 'items'], queryFn: contentApi.items });
  const { data: kps = [] }    = useQuery({ queryKey: ['public', 'kps'], queryFn: () => contentApi.knowledgeList({}) });
  const { data: exps = [] }   = useQuery({ queryKey: ['public', 'experiments'], queryFn: contentApi.experimentList });

  // ── 真实进度统计 ──
  const publishedKpSlugs = new Set(kps.map(k => k.slug));
  const store = getStore();
  const viewedKpSlugs = new Set(
    Object.values(store.items).flatMap(rec => rec.viewedKPSlugs).filter(s => publishedKpSlugs.has(s)),
  );
  const quizDoneSlugs = getCompletedKpSlugs().filter(s => publishedKpSlugs.has(s));
  const expDoneSlugs = getDoneExperimentSlugs().filter(s => exps.some(e => e.slug === s));

  const itemsDone = items.filter(it => calcItemProgress(it as any) >= 0.99).length;
  const scenesDone = scenes.filter(
    sc => (sc.items?.length ?? 0) > 0 && calcSceneProgress((sc.items ?? []) as any) >= 0.99,
  ).length;

  const explored = {
    scenes:    { done: scenesDone, total: scenes.length },
    items:     { done: itemsDone, total: items.length },
    knowledge: { done: viewedKpSlugs.size, total: kps.length },
  };

  // ── 积分 / 等级 ──
  const points =
    viewedKpSlugs.size * POINTS.kpViewed +
    quizDoneSlugs.length * POINTS.quizDone +
    expDoneSlugs.length * POINTS.expDone;
  let lvIdx = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i]!.from) { lvIdx = i; break; }
  }
  const lv = LEVELS[lvIdx]!;
  const nextLv = LEVELS[lvIdx + 1];
  const levelPct = nextLv ? (points - lv.from) / (nextLv.from - lv.from) : 1;

  // ── 勋章（全部由真实进度推导） ──
  const badges = [
    { id: 'first-item', name: '初次探索',   kind: 'explore', icon: '🔍', got: itemsDone >= 1,            desc: '完整探索 1 件物品' },
    { id: 'item-10',    name: '物品达人',   kind: 'explore', icon: '🧰', got: itemsDone >= 10,           desc: '完整探索 10 件物品' },
    { id: 'scene-1',    name: '场景通',     kind: 'explore', icon: '🏠', got: scenesDone >= 1,           desc: '完成 1 个场景的全部物品' },
    { id: 'scene-5',    name: '世界探索者', kind: 'explore', icon: '🗺️', got: scenesDone >= 5,           desc: '完成 5 个场景探索' },
    { id: 'quiz-1',     name: '答题新星',   kind: 'quiz',    icon: '✨', got: quizDoneSlugs.length >= 1,  desc: '1 个知识点小测满分' },
    { id: 'quiz-10',    name: '满分收割机', kind: 'quiz',    icon: '🏅', got: quizDoneSlugs.length >= 10, desc: '10 个知识点小测满分' },
    { id: 'lab-1',      name: '初次试验',   kind: 'lab',     icon: '🧪', got: expDoneSlugs.length >= 1,   desc: '完成第一个动手实验' },
    { id: 'lab-5',      name: '初级实验家', kind: 'lab',     icon: '🔬', got: expDoneSlugs.length >= 5,   desc: '完成 5 个动手实验' },
  ];
  const filtered = tab === 'all' ? badges : badges.filter(b => b.kind === tab);

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
              background: av.bg, color: 'var(--paper)',
              display: 'grid', placeItems: 'center',
              fontSize: 56,
            }}>
              {av.emoji}
            </div>
            {/* 中：身份 + 等级 + 进度 */}
            <div>
              <div className="eyebrow" style={{ color: 'var(--amber)' }}>／  我的书包 · MY BACKPACK</div>
              <h1 style={{ marginTop: 12, color: 'var(--paper)', fontSize: 48 }}>{user?.nickname ?? '科学探索者'}</h1>
              <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ padding: '4px 12px', borderRadius: 999, background: 'var(--amber)', color: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
                  Lv{lv.num} {lv.title}
                </span>
                {gradeLabel && (
                  <span style={{ padding: '4px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600 }}>
                    🎓 {gradeLabel}
                  </span>
                )}
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* 难度切换：内容按所选难度解锁 */}
                <div style={{ display: 'flex', gap: 4, border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: 3 }}>
                  {LEVEL_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setLevel(opt.value)}
                      title={opt.desc}
                      style={{
                        padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        background: level === opt.value ? 'var(--amber)' : 'transparent',
                        color: level === opt.value ? 'var(--ink)' : 'rgba(255,255,255,0.75)',
                        transition: 'background .15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
                  当前难度 {level} · 高于此难度的内容将锁定
                </span>
              </div>
              <div style={{ marginTop: 24, maxWidth: 520 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8, color: 'rgba(255,255,255,0.55)' }}>
                  <span>{nextLv ? `距离 Lv${nextLv.num} ${nextLv.title}` : '已到最高等级'}</span>
                  <span className="font-mono">{points}{nextLv ? ` / ${nextLv.from}` : ''} pt</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.12)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(1, levelPct) * 100}%`, height: '100%', background: 'var(--amber)', transition: 'width .5s ease' }}/>
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>
                  知识点 ×{POINTS.kpViewed} · 小测满分 ×{POINTS.quizDone} · 实验 ×{POINTS.expDone}
                </div>
              </div>
            </div>
            {/* 右：积分 */}
            <div style={{ textAlign: 'right' }}>
              <div className="font-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>TOTAL POINTS</div>
              <div className="font-display" style={{ fontSize: 88, color: 'var(--amber)', lineHeight: 1 }}>{points}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                已完成 {expDoneSlugs.length} 个实验 · {quizDoneSlugs.length} 次满分
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 探索度三联 */}
      <section className="page" style={{ paddingTop: 80 }}>
        <div className="eyebrow">／  EXPLORATION · 探索度</div>
        <h2 style={{ marginTop: 14, fontSize: 36 }}>你已经走了这么远</h2>
        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, border: '1px solid var(--hairline)', background: 'var(--paper)' }}>
          <ExploreCell label="场景" en="SCENES" v={explored.scenes} color="var(--blue)" first/>
          <ExploreCell label="物品" en="ITEMS" v={explored.items} color="var(--coral)"/>
          <ExploreCell label="知识点" en="KNOWLEDGE" v={explored.knowledge} color="var(--amber)"/>
        </div>
      </section>

      {/* 勋章墙 */}
      <section className="page" style={{ paddingTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <div className="eyebrow">／  BADGES · 勋章墙</div>
            <h2 style={{ marginTop: 14, fontSize: 36 }}>已获得 {badges.filter(b => b.got).length} / {badges.length}</h2>
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
        <h2 style={{ marginTop: 14, fontSize: 36 }}>已点亮 {explored.knowledge.done} 颗星</h2>
        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 56, alignItems: 'center', padding: 48, background: 'var(--ink)', color: 'var(--paper)', borderRadius: 12 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, fontSize: 16 }}>
              每浏览一个知识点，知识网络里就有一颗星会被点亮。继续探索，把整片宇宙点亮吧。
            </p>
            <button className="btn amber" style={{ marginTop: 28 }} onClick={() => nav('/knowledge')}>查看完整知识网络</button>
          </div>
          <Constellation done={explored.knowledge.done} total={Math.max(explored.knowledge.total, 1)}/>
        </div>
      </section>
    </div>
  );
}

function ExploreCell({ label, en, v, color, first }: { label: string; en: string; v: { done: number; total: number }; color: string; first?: boolean }) {
  const pct = v.total > 0 ? v.done / v.total : 0;
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

function BadgeCard({ b, kind }: {
  b: { id: string; name: string; icon: string; got: boolean; desc: string };
  kind: { label: string; en: string };
}) {
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
