import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { contentApi } from '../api/content';
import type { PublicExperiment, PublicSceneDetail } from '../api/content';

const UPLOADS = 'http://localhost:3000/uploads';

export function HomePage() {
  const nav = useNavigate();
  const go = (path: string) => { nav(path); window.scrollTo({ top: 0, behavior: 'instant' }); };
  return (
    <div>
      <HomeBanner go={go} />
      <HomeKitchenDemo go={go} />
      <HomeExperimentVideo />
      <HomeParentsLetter go={go} />
    </div>
  );
}

function HomeBanner({ go }: { go: (p: string) => void }) {
  const { data: stats } = useQuery({
    queryKey: ['public', 'stats'],
    queryFn: () => contentApi.stats(),
  });
  return (
    <section style={{
      width: '100%',
      background: 'linear-gradient(160deg, #0E1A33 0%, #1A2B4D 100%)',
      color: '#FFFFFF',
      position: 'relative',
      overflow: 'hidden',
      minHeight: 640,
    }}>
      <div className="blueprint-grid-dark" style={{ position: 'absolute', inset: 0, opacity: 0.7 }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ position: 'absolute', top: 28, right: 40, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, textAlign: 'right' }}>
        <div>DWG · 001 · MICROWAVE</div>
        <div style={{ marginTop: 4, color: 'var(--amber)' }}>● ONLINE · 2026.05</div>
      </div>
      <div style={{ position: 'absolute', bottom: 28, left: 40, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2 }}>
        SCALE 1 : 1　·　PRINCIPLE FIRST
      </div>
      <div style={{
        position: 'relative', maxWidth: 1440, margin: '0 auto',
        padding: '100px 40px 80px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64,
        alignItems: 'center', minHeight: 640,
      }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--amber)', marginBottom: 28 }}>／  生活科学的拆解课</div>
          <h1 style={{ fontSize: 76, lineHeight: 1.05, margin: 0, color: '#FFFFFF', fontWeight: 700, letterSpacing: '-0.02em' }}>
            身边的<span style={{ color: 'var(--amber)' }}>一切</span>，<br />
            都是科学。
          </h1>
          <p style={{ marginTop: 32, fontSize: 18, lineHeight: 1.7, color: 'rgba(255,255,255,0.7)', maxWidth: 480 }}>
            热水壶、微波炉、电视机⋯⋯ 每一件家里的东西，都藏着一段科学故事。
            从场景到物品，从物品到原理，最后亲手做一次实验。
          </p>
          <div style={{ marginTop: 40, display: 'flex', gap: 16 }}>
            <button className="btn amber lg" onClick={() => go('/scenes')}>开始探索 →</button>
          </div>
          <div style={{ marginTop: 64, display: 'flex', gap: 56 }}>
            <Stat n={stats ? String(stats.scenes) : '—'} label="个场景" sub="家 · 学校 · 公园 · 医院 · 商场" />
            <Stat n={stats ? String(stats.items) : '—'} label="件物品" sub="家电 · 厨具 · 玩具 · 工具" />
            <Stat n={stats ? String(stats.knowledgePoints) : '—'} label="个知识点" sub="物理 · 化学 · 生物" />
          </div>
        </div>
        <div style={{ height: 540, position: 'relative', display: 'grid', placeItems: 'center' }}>
          <HeroMicrowaveSVG />
        </div>
      </div>
    </section>
  );
}

function Stat({ n, label, sub }: { n: string; label: string; sub: string }) {
  return (
    <div>
      <div className="font-display" style={{ fontSize: 44, color: '#FFFFFF', lineHeight: 1, fontWeight: 700 }}>{n}</div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>{sub}</div>
    </div>
  );
}

// 厨房 2.5D 模型图上各电器的热点坐标（占整图 2304×1536 宽高的百分比），按物品 slug 映射
const KITCHEN_HOTSPOTS: Record<string, { x: number; y: number; w: number; h: number; label: string }> = {
  'range-hood': { x: 57, y: 23, w: 11, h: 16, label: '油烟机 / Range Hood' },
  knife: { x: 42, y: 45, w: 9, h: 7, label: '菜刀 / Knife' },
  stove: { x: 54, y: 51, w: 11, h: 17, label: '燃气灶 / Gas Stove' },
  microwave: { x: 67, y: 49, w: 7, h: 9, label: '微波炉 / Microwave' },
  fridge: { x: 75, y: 50, w: 12, h: 28, label: '冰箱 / Refrigerator' },
};

const SUBJECT_META: Record<string, { label: string; color: string }> = {
  PHYSICS: { label: '物理', color: 'var(--blue)' },
  CHEMISTRY: { label: '化学', color: 'var(--amber)' },
  BIOLOGY: { label: '生物', color: 'var(--green)' },
};
function subjectMeta(subject: string) {
  return SUBJECT_META[subject] ?? { label: subject, color: 'var(--ink-3)' };
}

// 首屏：纯 SVG 微波炉功能拆解线稿（无背景，浅色 + 琥珀强调）
function HeroMicrowaveSVG() {
  const LINE = 'rgba(206,224,242,0.85)';
  const FAINT = 'rgba(206,224,242,0.32)';
  const AMBER = '#D89531';
  const callouts: Array<{ dot: [number, number]; to: [number, number]; name: string; note: string; anchor: 'start' | 'end' }> = [
    { dot: [398, 150], to: [470, 70], name: '磁控管 Magnetron', note: '产生 2.45GHz 微波', anchor: 'start' },
    { dot: [300, 176], to: [120, 70], name: '波导管 Waveguide', note: '把微波导入加热腔', anchor: 'end' },
    { dot: [424, 286], to: [512, 300], name: '控制面板', note: '设定时间与火力', anchor: 'start' },
    { dot: [248, 346], to: [300, 452], name: '转盘 Turntable', note: '旋转让受热均匀', anchor: 'start' },
    { dot: [168, 300], to: [44, 372], name: '金属门网', note: '反射微波 · 保证安全', anchor: 'end' },
  ];
  return (
    <svg viewBox="0 0 580 520" style={{ width: '100%', height: '100%' }} fill="none">
      {/* 机身 */}
      <rect x="108" y="170" width="362" height="206" rx="14" stroke={LINE} strokeWidth="2" />
      {/* 加热腔（门 / 观察窗） */}
      <rect x="128" y="188" width="244" height="170" rx="4" stroke={LINE} strokeWidth="1.5" />
      {/* 门网 mesh */}
      <g stroke={FAINT} strokeWidth="1">
        {Array.from({ length: 7 }).map((_, i) => <line key={`v${i}`} x1={140 + i * 16} y1="196" x2={140 + i * 16} y2="350" />)}
        {Array.from({ length: 8 }).map((_, i) => <line key={`h${i}`} x1="136" y1={204 + i * 19} x2="248" y2={204 + i * 19} />)}
      </g>
      {/* 控制面板 */}
      <rect x="380" y="188" width="84" height="170" rx="4" stroke={LINE} strokeWidth="1.5" />
      <rect x="392" y="202" width="60" height="28" rx="3" stroke={AMBER} strokeWidth="1.4" />
      <text x="422" y="221" textAnchor="middle" fill={AMBER} fontSize="11" fontFamily="monospace">00:00</text>
      <circle cx="422" cy="256" r="13" stroke={LINE} strokeWidth="1.4" />
      <circle cx="422" cy="256" r="3" fill={AMBER} />
      <g fill={FAINT}>
        {Array.from({ length: 9 }).map((_, i) => (
          <rect key={i} x={398 + (i % 3) * 18} y={284 + Math.floor(i / 3) * 18} width="12" height="12" rx="2" stroke={LINE} strokeWidth="1" fill="none" />
        ))}
      </g>
      {/* 磁控管 */}
      <rect x="372" y="120" width="56" height="48" rx="4" stroke={LINE} strokeWidth="1.6" />
      <g stroke={FAINT} strokeWidth="1">
        <line x1="382" y1="120" x2="382" y2="168" /><line x1="394" y1="120" x2="394" y2="168" />
        <line x1="406" y1="120" x2="406" y2="168" /><line x1="418" y1="120" x2="418" y2="168" />
      </g>
      {/* 波导管：磁控管 → 腔体顶 */}
      <path d="M 372 152 L 320 152 L 320 188" stroke={LINE} strokeWidth="1.6" />
      <path d="M 384 160 L 330 160 L 330 188" stroke={FAINT} strokeWidth="1" />
      {/* 微波纹（动效） */}
      <g className="oisee-wave" stroke={AMBER} strokeWidth="1.4">
        <path d="M 150 240 Q 168 226 186 240 T 222 240" />
        <path d="M 150 268 Q 168 254 186 268 T 222 268" />
        <path d="M 252 240 Q 270 226 288 240 T 324 240" />
        <path d="M 252 268 Q 270 254 288 268 T 324 268" />
      </g>
      {/* 转盘 + 食物 */}
      <ellipse cx="248" cy="338" rx="74" ry="16" stroke={LINE} strokeWidth="1.4" />
      <ellipse cx="248" cy="312" rx="40" ry="32" stroke={LINE} strokeWidth="1.4" />
      <ellipse cx="248" cy="338" rx="8" ry="3" fill={AMBER} />
      {/* 标注引线 + 标签 */}
      {callouts.map((c, i) => (
        <g key={i}>
          <line x1={c.dot[0]} y1={c.dot[1]} x2={c.to[0]} y2={c.to[1]} stroke={AMBER} strokeWidth="1" opacity="0.55" />
          <circle cx={c.dot[0]} cy={c.dot[1]} r="3.2" fill={AMBER} />
          <circle cx={c.to[0]} cy={c.to[1]} r="2" fill={AMBER} />
          <text x={c.to[0] + (c.anchor === 'start' ? 8 : -8)} y={c.to[1] - 2} textAnchor={c.anchor} fill="rgba(255,255,255,0.92)" fontSize="13" fontWeight={600}>{c.name}</text>
          <text x={c.to[0] + (c.anchor === 'start' ? 8 : -8)} y={c.to[1] + 14} textAnchor={c.anchor} fill="rgba(255,255,255,0.45)" fontSize="10.5" fontFamily="monospace">{c.note}</text>
        </g>
      ))}
      {/* 公式 */}
      <text x="120" y="488" fill="rgba(216,149,49,0.5)" fontSize="12" fontFamily="monospace">f = 2.45 GHz　λ ≈ 122 mm</text>
    </svg>
  );
}

function HomeKitchenDemo({ go }: { go: (p: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const { data: scene } = useQuery({
    queryKey: ['public', 'scene', 'home-kitchen'],
    queryFn: () => contentApi.sceneBySlug('home-kitchen'),
  });

  const hotItems = (scene?.items ?? []).filter((it) => KITCHEN_HOTSPOTS[it.slug]);
  // 默认选中第一件物品，让页面加载即有知识点标记
  const selectedSlug = selected ?? hotItems[0]?.slug ?? null;
  const selectedItem = hotItems.find((it) => it.slug === selectedSlug) ?? null;

  return (
    <section className="section" style={{ paddingTop: 96 }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 40px' }}>
        <div className="sec-head" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'end' }}>
          <div>
            <span className="eyebrow">／  拆解链路 · 演示</span>
            <h2 style={{ marginTop: 20, fontSize: 56, maxWidth: 800 }}>从一台厨房电器<br />看见整套科学原理</h2>
            <p style={{ marginTop: 18, color: 'var(--ink-3)', maxWidth: 640, fontSize: 17, lineHeight: 1.7 }}>
              点击下面厨房里的任意电器 — 它身上的科学原理会从画面里被「引」出来，在右侧展开。
            </p>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: 2, textAlign: 'right' }}>
            CLICK TO INSPECT
          </div>
        </div>

        <div style={{
          marginTop: 48,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.55fr) minmax(330px, 1fr)',
          gap: 40,
          alignItems: 'stretch',
        }}>
          <KitchenScene items={hotItems} selectedSlug={selectedSlug} onSelect={setSelected} />
          <KitchenDetailPanel item={selectedItem} go={go} />
        </div>

        <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid var(--hairline)' }}>
          <ChainPath />
        </div>
      </div>
    </section>
  );
}

type SceneItem = PublicSceneDetail['items'][number];

function KitchenScene({ items, selectedSlug, onSelect }: {
  items: SceneItem[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
}) {
  const selectedSpot = selectedSlug ? KITCHEN_HOTSPOTS[selectedSlug] : null;
  // 引导线坐标：viewBox 300×200（与 3:2 容器等比），标记点在 (x*3, y*2)
  // 参考示意图：标记点 → 斜向右上的拐点 → 水平虚线引出画面右侧（连向知识点框）
  const mx = selectedSpot ? selectedSpot.x * 3 : 0;
  const my = selectedSpot ? selectedSpot.y * 2 : 0;
  const ky = 38;                                   // 拐点高度（靠近顶部）
  const kx = Math.min(288, Math.max(mx + 40, 232)); // 拐点横坐标（斜线向右上）

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: '3 / 2',
      borderRadius: 20,
      overflow: 'visible',           /* 允许引导线延伸到右侧模块 */
      background: 'linear-gradient(160deg, #EAF1F8 0%, #DCE6F1 100%)',
      border: '1px solid var(--hairline)',
    }}>
      <img
        src={`${UPLOADS}/home/kitchen-diorama.png`}
        alt="厨房 2.5D 模型"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
      />

      {/* 引导线 + 标记点（覆盖层，不拦截点击） */}
      {selectedSpot && (() => {
        // 水平终点：300 = 场景右边框，+15 ≈ 越过 40px gap 到达知识点框左边框
        const ex = 315;
        return (
          <svg
            key={selectedSlug}
            className="oisee-slide-in"
            viewBox="0 0 300 200"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 6 }}
          >
            {/* 折线引导线：1px，vector-effect 保持物理 1px 粗细 */}
            <polyline
              points={`${mx},${my} ${kx},${ky} ${ex},${ky}`}
              fill="none" stroke="var(--ink-3)" strokeWidth="1"
              strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round"
              opacity="0.55" vectorEffect="non-scaling-stroke"
            />
            {/* 右侧端点：小菱形 + 中心点，锚在知识点框边框上 */}
            <g opacity="0.7" vectorEffect="non-scaling-stroke">
              <polygon
                points={`${ex},${ky - 4} ${ex + 3.5},${ky} ${ex},${ky + 4} ${ex - 3.5},${ky}`}
                fill="none" stroke="var(--ink-3)" strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={ex} cy={ky} r="1.5" fill="var(--ink-3)" />
            </g>
            {/* 脉冲环 */}
            <circle
              className="oisee-marker-ring"
              cx={mx} cy={my} r="7"
              fill="none" stroke="var(--amber)" strokeWidth="1.6"
              style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'oisee-marker-ring 1.6s ease-out infinite' }}
            />
            {/* 标记点：白心 + 琥珀外环 */}
            <circle cx={mx} cy={my} r="5.5" fill="#fff" stroke="var(--amber)" strokeWidth="2.4" />
            <circle cx={mx} cy={my} r="2" fill="var(--amber)" />
          </svg>
        );
      })()}

      {/* 可点击热区 */}
      {items.map((item) => {
        const spot = KITCHEN_HOTSPOTS[item.slug]!;
        const active = selectedSlug === item.slug;
        return (
          <button
            key={item.id}
            type="button"
            title={spot.label}
            onClick={() => onSelect(item.slug)}
            style={{
              position: 'absolute',
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              transform: 'translate(-50%, -50%)',
              width: `${spot.w}%`,
              height: `${spot.h}%`,
              cursor: 'pointer',
              borderRadius: 12,
              padding: 0,
              border: 'none',
              background: 'transparent',
              zIndex: 2,
            }}
          />
        );
      })}
    </div>
  );
}

function KitchenDetailPanel({ item, go }: { item: SceneItem | null; go: (p: string) => void }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['public', 'item', item?.slug],
    queryFn: () => contentApi.itemBySlug(item!.slug),
    enabled: !!item,
  });

  if (!item) {
    return (
      <div style={{
        borderRadius: 20,
        border: '1.5px dashed var(--hairline)',
        background: 'var(--bg)',
        display: 'grid',
        placeItems: 'center',
        padding: 32,
        minHeight: 320,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 240 }}>
          <div style={{ width: 48, height: 48, margin: '0 auto 18px', borderRadius: 999, border: '2px solid var(--amber)', display: 'grid', placeItems: 'center', color: 'var(--amber)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>?</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)', lineHeight: 1.4 }}>点击左侧任意电器</div>
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>这里会展示它背后的科学原理与知识点</div>
        </div>
      </div>
    );
  }

  const spot = KITCHEN_HOTSPOTS[item.slug]!;
  const principle = detail?.principleByLevel?.L1 ?? item.shortDesc;
  const kps = item.knowledgePoints?.map((k) => k.knowledgePoint) ?? [];

  return (
    <div
      key={item.slug}
      className="oisee-slide-in"
      style={{
        borderRadius: 20,
        border: '1px solid var(--hairline)',
        background: 'var(--paper)',
        padding: 30,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 12px 40px rgba(14,26,51,0.06)',
      }}
    >
      <div className="font-mono" style={{ fontSize: 10, color: 'var(--amber)', letterSpacing: 2 }}>{spot.label}</div>
      <h3 style={{ marginTop: 10, fontSize: 30 }}>{item.name}</h3>
      <p style={{ marginTop: 10, fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.65 }}>{item.shortDesc}</p>

      <div style={{ height: 1, background: 'var(--hairline)', margin: '22px 0' }} />

      <div className="eyebrow" style={{ marginBottom: 10 }}>原理说明 · L1 启蒙</div>
      <p style={{ margin: 0, fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.75, minHeight: 48 }}>
        {isLoading ? '加载中…' : principle}
      </p>

      {kps.length > 0 && (
        <>
          <div className="eyebrow" style={{ margin: '24px 0 12px' }}>涉及知识点</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {kps.map((k) => {
              const m = subjectMeta(k.subject);
              return (
                <span
                  key={k.id}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 999,
                    border: `1px solid ${m.color}`, background: 'transparent',
                    color: m.color, fontSize: 12, fontWeight: 600,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color }} />
                  {k.name}
                </span>
              );
            })}
          </div>
        </>
      )}

      <button
        className="btn amber"
        style={{ marginTop: 'auto', alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => go(`/items/${item.slug}`)}
      >
        一起探索 →
      </button>
    </div>
  );
}

function ChainPath() {
  const steps = [
    { n: '01', label: '场景', value: '走进一个场景', color: 'var(--blue)' },
    { n: '02', label: '物品', value: '选择一件物品', color: 'var(--ink)' },
    { n: '03', label: '原理', value: '了解工作原理', color: 'var(--amber)' },
    { n: '04', label: '实验', value: '亲手验证一次', color: 'var(--green)' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="font-mono" style={{ color: s.color, fontSize: 12, fontWeight: 600 }}>{s.n}</span>
            <div style={{ flex: 1, height: 1, background: s.color, opacity: 0.4 }} />
            {i < 3 && <span style={{ color: s.color, opacity: 0.4 }}>→</span>}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>{s.label.toUpperCase()}</div>
            <div className="font-display" style={{ fontSize: 22, color: 'var(--ink)', lineHeight: 1.2 }}>{s.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HomeExperimentVideo() {
  const { data: experiments } = useQuery({
    queryKey: ['public', 'experiments'],
    queryFn: () => contentApi.experimentList(),
  });
  const playerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState<PublicExperiment | null>(null);
  const [playing, setPlaying] = useState(false);

  const list = experiments ?? [];
  const featured = active ?? list[0] ?? null;
  const TILE_SLUGS = ['exp-marshmallow', 'exp-ice-salt', 'exp-grape-plasma'];
  const curated = TILE_SLUGS
    .map((s) => list.find((e) => e.slug === s))
    .filter((e): e is PublicExperiment => Boolean(e));
  const tiles = curated.length ? curated : list.slice(0, 3);

  const select = (exp: PublicExperiment) => {
    setActive(exp);
    setPlaying(!!exp.videoUrl);
    playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const LEVEL_LABEL: Record<string, string> = { L1: 'L1 启蒙', L2: 'L2 探索', L3: 'L3 深化' };

  return (
    <section className="section" style={{ paddingTop: 32 }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 40px' }}>
        <div className="sec-head">
          <span className="eyebrow">／  动手实验</span>
          <h2 style={{ marginTop: 20, fontSize: 56, maxWidth: 900 }}>看完原理还不够<br />真正学会，要从「亲手做一次」开始。</h2>
          <p style={{ marginTop: 18, color: 'var(--ink-3)', maxWidth: 720, fontSize: 17, lineHeight: 1.7 }}>
            我们设计了一系列家庭可行的实验。每完成一个，你都能在屏幕外的世界里印证一次科学。
          </p>
        </div>
      </div>
      <div style={{ marginTop: 64, position: 'relative', background: 'var(--ink)', color: 'var(--paper)' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '72px 40px 56px' }}>
        <div
          ref={playerRef}
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            position: 'relative',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #0E1A33 0%, #1A2B4D 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
          }}
        >
          {playing && featured?.videoUrl ? (
            <video
              key={featured.slug}
              src={featured.videoUrl}
              poster={featured.coverUrl ?? undefined}
              controls
              autoPlay
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
            />
          ) : (
            <>
              <VideoLoadingMark />
              <div style={{ position: 'absolute', left: 48, bottom: 48, display: 'flex', alignItems: 'center', gap: 24 }}>
                <button
                  onClick={() => { if (featured?.videoUrl) setPlaying(true); }}
                  title={featured?.videoUrl ? '播放' : '视频即将上线'}
                  style={{ width: 84, height: 84, borderRadius: 999, border: 'none', background: 'var(--amber)', color: 'var(--ink)', display: 'grid', placeItems: 'center', cursor: featured?.videoUrl ? 'pointer' : 'not-allowed', opacity: featured?.videoUrl ? 1 : 0.5, transition: 'transform .2s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24"><path d="M6 4l14 8-14 8V4z" fill="currentColor"/></svg>
                </button>
                <div>
                  <div className="font-mono" style={{ fontSize: 11, color: 'var(--amber)', letterSpacing: 2, marginBottom: 6 }}>EXPERIMENT · 001</div>
                  <h3 style={{ margin: 0, fontSize: 28, color: 'var(--paper)' }}>{featured?.name ?? '动手实验'}</h3>
                  <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                    {featured ? `${featured.durationMin} 分钟 · ${LEVEL_LABEL[featured.difficulty] ?? featured.difficulty} · ${featured.materialType ?? ''}` : ''}
                  </div>
                  {featured && !featured.videoUrl && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--amber)' }}>视频即将上线</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
          {tiles.map((e, i) => (
            <div
              key={e.slug}
              onClick={() => select(e)}
              style={{ cursor: 'pointer', paddingTop: 16, borderTop: featured?.slug === e.slug ? '1px solid var(--amber)' : '1px solid rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div className="font-mono" style={{ color: 'var(--amber)', fontSize: 11, letterSpacing: 2 }}>{`EXP ${String(i + 1).padStart(2, '0')}`}</div>
              <h4 style={{ color: 'var(--paper)', fontSize: 22 }}>{e.name}</h4>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.6 }}>{e.description}</p>
              <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{e.durationMin} 分钟 · {e.difficulty}</div>
            </div>
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}

// 视频默认态：OISee 动画标记 + 纯色背景 + 「视频加载中」
function VideoLoadingMark() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#0E1A33' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <div style={{ position: 'relative', width: 104, height: 104 }}>
          <svg width="104" height="104" viewBox="0 0 104 104">
            <circle cx="52" cy="52" r="44" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
            <circle
              cx="52" cy="52" r="44"
              fill="none" stroke="var(--amber)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray="80 196"
              style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'oisee-spin 1.1s linear infinite' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: '#fff' }}>O</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="font-display" style={{ fontSize: 24, color: '#fff', letterSpacing: '-0.01em' }}>OISee</div>
          <div className="font-mono" style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: 3 }}>视频加载中 · LOADING</div>
        </div>
      </div>
    </div>
  );
}

function HomeParentsLetter({ go }: { go: (p: string) => void }) {
  return (
    <section style={{ background: 'var(--paper)', borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '120px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 80 }}>
          <div>
            <div className="eyebrow">／  给家长的一封信</div>
            <h2 style={{ marginTop: 28, fontSize: 52, lineHeight: 1.1 }}>
              我们想让孩子<br />
              <span style={{ color: 'var(--amber)' }}>先好奇，再学习。</span>
            </h2>
            <p style={{ marginTop: 28, fontSize: 17, color: 'var(--ink-3)', lineHeight: 1.8 }}>
              市面上的科普产品大多是「先抛知识，再要求记忆」。
              我们反过来——从孩子熟悉的物品出发，让他们先发现具体，再去拆解抽象。
            </p>
            <div style={{ marginTop: 32, padding: '20px 24px', background: 'var(--bg)', borderLeft: '2px solid var(--amber)' }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>核心理念</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1.4, color: 'var(--ink)' }}>
                场景 → 物品 → 知识点 → 实验
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-3)' }}>四级拆解，由具象到抽象</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <PhilosophyRow n="01" title="从生活物品出发" body="孩子熟悉的厨房、书包、公园里的电器、玩具、植物——每一个都是讲科学的入口，不需要为「学习」单独腾出兴趣。"/>
            <PhilosophyRow n="02" title="一物三看，越看越深" body="同一个物品，按 L1/L2/L3 难度承载三层知识点。微波炉对 8 岁孩子是「看不见的波让食物变热」，对 14 岁是「2.45GHz 介电加热」——同一个孩子也会随着难度提升，从「啊原来如此」反复体验。"/>
            <PhilosophyRow n="03" title="知识必须落在「手」上" body="所有积分行为里，「完成动手实验」分值最高。激励体系不是为了让孩子刷网站，而是让他们离开屏幕、动手验证。"/>
            <PhilosophyRow n="04" title="家长的角色：陪伴与安全" body="L1 全程陪伴，L2/L3 仅安全实验需到场。我们在每个实验里标注是否需要家长参与，并提供完整安全提示。"/>
            <div style={{ marginTop: 32, padding: 28, background: 'var(--bg)' }}>
              <div className="eyebrow" style={{ marginBottom: 16 }}>难度分层</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                <DiffCard level="L1" age="6-9 岁" title="启蒙" desc="关注「是什么」——现象描述、生活化类比"/>
                <DiffCard level="L2" age="10-13 岁" title="探索" desc="关注「为什么」——原理与机制"/>
                <DiffCard level="L3" age="14-16 岁" title="深化" desc="关注「怎么算」——量化与学科化"/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PhilosophyRow({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div style={{ padding: '28px 0', borderTop: '1px solid var(--hairline)', display: 'grid', gridTemplateColumns: '60px 200px 1fr', gap: 24, alignItems: 'start' }}>
      <div className="font-mono" style={{ color: 'var(--amber)', fontSize: 13, fontWeight: 600, paddingTop: 2 }}>{n}</div>
      <div className="font-display" style={{ fontSize: 22, color: 'var(--ink)', lineHeight: 1.3 }}>{title}</div>
      <p style={{ margin: 0, fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.7 }}>{body}</p>
    </div>
  );
}

function DiffCard({ level, age, title, desc }: { level: string; age: string; title: string; desc: string }) {
  const colors: Record<string, string> = { L1: 'var(--green)', L2: 'var(--amber)', L3: 'var(--plum)' };
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="font-mono" style={{ color: colors[level], fontSize: 18, fontWeight: 700 }}>{level}</span>
        <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{age}</span>
      </div>
      <div className="font-display" style={{ fontSize: 18, marginTop: 6 }}>{title}</div>
      <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}
