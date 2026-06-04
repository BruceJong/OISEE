import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { contentApi } from '@/api/content';
import { recordKpViewed } from '@/utils/progress';
import { useBackNav, useBackStack, popBack, pushBack } from '@/utils/back-nav';

const userLevel = 'L2';
const ORDER: Record<string, number> = { L1: 1, L2: 2, L3: 3 };
function ord(k: string) { return ORDER[k] ?? 0; }

export function ItemDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const back = useBackNav();
  const stack = useBackStack();
  const [tab, setTab] = useState<'explode' | 'knowledge' | 'experiments'>('explode');
  const [activePart, setActivePart] = useState<number | null>(null);

  const { data: item, isLoading } = useQuery({
    queryKey: ['public', 'item', slug],
    queryFn: () => contentApi.itemBySlug(slug!),
    enabled: !!slug,
  });

  if (isLoading) return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', letterSpacing: 2 }}>LOADING...</div>;
  if (!item) return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>物品不存在</div>;

  const kps = item.knowledgePoints ?? [];
  const parts = (item.parts as any[]) ?? [];
  const principleByLevel = (item as any).principleByLevel ?? {};
  const backScene = item.scene?.slug;

  const TABS = [
    { id: 'explode' as const, label: '爆炸图', count: parts.length, en: 'EXPLODED' },
    { id: 'knowledge' as const, label: '知识点', count: kps.length, en: 'KNOWLEDGE' },
    { id: 'experiments' as const, label: '实验', count: (item as any).experiments?.length ?? 0, en: 'EXPERIMENTS' },
  ];

  return (
    <div>
      {/* 顶部信息 + 视频 */}
      <div style={{ background: 'var(--paper)', borderBottom: '1px solid var(--hairline)' }}>
        <div className="page" style={{ paddingBottom: 56 }}>
          {back ? (
            <button
              onClick={() => {
                // 弹出栈顶，余下的栈跟着 nav 一起传过去 → 形成多层链式返回
                const target = popBack(stack);
                if (target) nav(target.url, { state: target.state });
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-3)', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '8px 0', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
            >
              <span>←</span> 返回{back.label}
            </button>
          ) : backScene ? (
            <button onClick={() => nav(`/scenes/${backScene}`)} style={{ background: 'transparent', border: 'none', color: 'var(--ink-3)', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '8px 0', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
              <span>←</span> 返回{item.scene?.name}
            </button>
          ) : null}
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 56, alignItems: 'center' }}>
            {/* 视频/图片 */}
            <div style={{ aspectRatio: '16 / 9', background: 'linear-gradient(135deg, #0E1A33 0%, #1A2B4D 100%)', borderRadius: 8, position: 'relative', overflow: 'hidden', border: '1px solid var(--hairline)' }}>
              {item.itemImageUrl ? (
                <img src={item.itemImageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}/>
              ) : (
                <VideoBgSVG />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(14,26,51,0.8) 0%, rgba(14,26,51,0.1) 100%)' }}/>
              <div style={{ position: 'absolute', left: 40, bottom: 40, display: 'flex', alignItems: 'center', gap: 20 }}>
                <button style={{ width: 72, height: 72, borderRadius: 999, border: 'none', background: 'var(--amber)', color: 'var(--ink)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24"><path d="M6 4l14 8-14 8V4z" fill="currentColor"/></svg>
                </button>
                <div>
                  <div className="font-mono" style={{ fontSize: 10, color: 'var(--amber)', letterSpacing: 2, marginBottom: 4 }}>PRINCIPLE VIDEO</div>
                  <div style={{ color: 'var(--paper)', fontSize: 18, fontWeight: 600 }}>{(item as any).videoTitle || `${item.name} 是如何工作的？`}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                    {(item as any).videoDurationSec ? `${Math.floor((item as any).videoDurationSec / 60)}:${String((item as any).videoDurationSec % 60).padStart(2, '0')}` : '—:—'}
                  </div>
                </div>
              </div>
            </div>

            {/* 右：物品介绍 */}
            <div>
              <div className="eyebrow">／  {item.scene?.groupName} · {item.scene?.name} · ITEM</div>
              <h1 style={{ marginTop: 16, fontSize: 72, lineHeight: 1 }}>{item.name}</h1>
              <p className="lead" style={{ marginTop: 16 }}>{item.shortDesc}</p>
              <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="tag">{kps.length} 知识点</span>
                <span className="tag">{parts.length} 零件</span>
              </div>

              {/* 一物三看 */}
              <div style={{ marginTop: 32 }}>
                <div className="eyebrow" style={{ marginBottom: 12 }}>一物三看</div>
                {(['L1', 'L2', 'L3'] as const).map(lv => {
                  const locked = ord(lv) > ord(userLevel);
                  return (
                    <div key={lv} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '12px 0', borderTop: '1px solid var(--hairline)' }}>
                      <span className={`tag ${lv}`}>{`${lv} · ${{L1:'启蒙',L2:'探索',L3:'深化'}[lv]}`}</span>
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: locked ? 'var(--ink-4)' : 'var(--ink-2)' }}>
                        {locked ? '—— 当前难度尚未解锁，看见原理需先获得更多勋章 ——' : (principleByLevel[lv] ?? '（暂无内容）')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="page">
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--hairline)', marginBottom: 40 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '20px 28px', background: 'transparent', border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--ink)' : '2px solid transparent',
              marginBottom: -1, color: tab === t.id ? 'var(--ink)' : 'var(--ink-3)',
              cursor: 'pointer', fontSize: 15, fontWeight: 600,
              display: 'flex', alignItems: 'baseline', gap: 10, fontFamily: 'inherit',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, color: tab === t.id ? 'var(--amber)' : 'var(--ink-4)' }}>{t.en}</span>
              {t.label}
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>({t.count})</span>
            </button>
          ))}
        </div>

        {tab === 'explode' && <ExplodeTab parts={parts} activePart={activePart} onActivePart={setActivePart} item={item} />}
        {tab === 'knowledge' && <KnowledgeTab kps={kps} itemSlug={item.slug} itemName={item.name} backStack={stack} />}
        {tab === 'experiments' && <ExpsTab item={item} />}
      </div>
    </div>
  );
}

function VideoBgSVG() {
  return (
    <svg viewBox="0 0 1200 675" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="vidgrid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 0 0 L 0 48 M 0 0 L 48 0" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#vidgrid)"/>
      <g stroke="#D89531" strokeWidth="1.3" fill="none" opacity="0.4">
        <path d="M 100 200 Q 130 180 160 200 T 220 200 T 280 200"/>
        <path d="M 920 380 Q 950 360 980 380 T 1040 380 T 1100 380"/>
      </g>
    </svg>
  );
}

function ExplodeTab({ parts, activePart, onActivePart, item }: { parts: any[]; activePart: number | null; onActivePart: (n: number | null) => void; item: any }) {
  if (!parts.length && !item.explodedImageUrl) {
    return (
      <div className="placeholder" style={{ height: 300 }}>
        <div>
          <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 12 }}>🔧</div>
          <div>爆炸图待生成</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 40 }}>
      {/* 左：图 */}
      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--hairline)', background: 'var(--bg)' }}>
        {item.explodedImageUrl ? (
          <>
            <img src={item.explodedImageUrl} alt={`${item.name}爆炸图`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', minHeight: 360 }}/>
            {parts.map(p => (
              <button key={p.no} onClick={() => onActivePart(activePart === p.no ? null : p.no)}
                style={{
                  position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%,-50%)',
                  width: 28, height: 28, borderRadius: '50%',
                  background: activePart === p.no ? 'var(--amber)' : 'var(--ink)',
                  color: activePart === p.no ? 'var(--ink)' : '#fff',
                  border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  transition: 'all 0.15s ease',
                  boxShadow: activePart === p.no ? '0 0 0 3px rgba(216,149,49,0.4)' : '0 2px 6px rgba(14,26,51,0.3)',
                }}>
                {p.no}
              </button>
            ))}
          </>
        ) : (
          <div style={{ aspectRatio: '16/11', display: 'grid', placeItems: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--ink-3)' }}>
              <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 8 }}>🔧</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 2 }}>EXPLODED VIEW · COMING SOON</div>
            </div>
          </div>
        )}
      </div>

      {/* 右：零件列表 */}
      <div>
        <div className="eyebrow">／  PARTS LIST · {parts.length} 件主要零件</div>
        <h3 style={{ marginTop: 16 }}>把{item.name}拆开看看</h3>
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {parts.map(p => (
            <div key={p.no} onMouseEnter={() => onActivePart(p.no)} onMouseLeave={() => onActivePart(null)}
              style={{ padding: '16px 18px', borderTop: '1px solid var(--hairline)', background: activePart === p.no ? 'var(--bg)' : 'transparent', cursor: 'pointer', transition: 'background .12s ease', display: 'grid', gridTemplateColumns: '40px 1fr', gap: 14 }}>
              <span className="font-mono" style={{ color: 'var(--amber)', fontSize: 12, fontWeight: 600 }}>{String(p.no).padStart(2, '0')}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{p.name}</div>
                <div style={{ marginTop: 4, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KnowledgeTab({ kps, itemSlug, itemName, backStack }: {
  kps: any[]; itemSlug?: string; itemName?: string;
  backStack?: import('@/utils/back-nav').BackTarget[];
}) {
  if (!kps.length) return <div className="placeholder" style={{ height: 200 }}>暂无关联知识点</div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
      {kps.map((k: any) => {
        const kp = k.knowledgePoint ?? k;
        const locked = ord(kp.difficulty) > ord(userLevel);
        // 把当前物品页推进栈底，让 KP 详情可以多层返回
        const nextState = itemSlug && itemName
          ? pushBack(backStack ?? [], { url: `/items/${itemSlug}`, label: itemName })
          : undefined;
        return (
          <Link key={kp.id} to={`/knowledge/${kp.slug}`}
            state={nextState}
            onClick={() => {
              // 点击进入 KP 详情即标记为已读 → 推进物品探索度
              if (itemSlug && !locked) recordKpViewed(itemSlug, kp.slug);
            }}
            className={`card lift ${locked ? 'locked' : ''}`}
            style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit' }}>
            <KnowledgeCoverMini subject={kp.subject} name={kp.name} illustrationUrl={kp.illustrationUrl} />
            <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <span className={`tag ${kp.difficulty}`}>{`${kp.difficulty} · ${{L1:'启蒙',L2:'探索',L3:'深化'}[kp.difficulty as string] ?? ''}`}</span>
                <span className="tag">{kp.subject}</span>
              </div>
              <h4 style={{ fontSize: 17, margin: 0 }}>{kp.name}</h4>
              {kp.summary && <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, flex: 1 }}>{kp.summary}</p>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--ink-3)', paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                <span className="font-mono">查看详情</span><span>→</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function KnowledgeCoverMini({ subject, name, illustrationUrl }: {
  subject: string; name: string; illustrationUrl?: string | null;
}) {
  const colors: Record<string, string> = { PHYSICS: '#305FBE', CHEMISTRY: '#C95746', BIOLOGY: '#4A8662', GEOGRAPHY: '#8C6B2A', OTHER: '#6B4D8C' };
  const icons: Record<string, string> = { PHYSICS: '⚛', CHEMISTRY: '⚗', BIOLOGY: '🧬', GEOGRAPHY: '🌍', OTHER: '🔬' };
  const c = colors[subject] ?? '#305FBE';
  return (
    <div style={{ aspectRatio: '16/9', background: c + '18', position: 'relative', overflow: 'hidden' }}>
      {illustrationUrl ? (
        <img src={illustrationUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 48, opacity: 0.35 }}>
          {icons[subject] ?? '🔬'}
        </div>
      )}
      {/* 4px 左色条 + 学科 mono 标签：叠在图片上方 */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: c, zIndex: 3 }}/>
      <div className="font-mono" style={{
        position: 'absolute', bottom: 10, left: 14, zIndex: 3,
        padding: '3px 9px', borderRadius: 999,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        fontSize: 10, color: c, letterSpacing: 1.5, fontWeight: 700,
        border: `1px solid ${c}33`,
      }}>{subject}</div>
    </div>
  );
}

function ExpsTab({ item }: { item: any }) {
  return <div className="placeholder" style={{ height: 200 }}>暂无关联实验</div>;
}
