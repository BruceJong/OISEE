import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { contentApi, type PublicScene } from '@/api/content';
import { useProgress } from '@/utils/progress';

/* ────────────────────────────────────────────────────────────────
   地图：4096×2304（16:9）  MAP_SCALE=1.4
   坐标全部按图片百分比（x/y ∈ [0,100]）
   每个 L1 地点：
     • box {l,t,r,b}：可点击建筑热区矩形
     • door {x,y}：选中态 3D 立柱落点
──────────────────────────────────────────────────────────────── */
const MAP_URL   = 'http://localhost:3000/uploads/home/map-v11.png';
const MAP_SCALE = 1.3;

type Box = { l: number; t: number; r: number; b: number };

type Loc = {
  slug: string;
  name: string;
  groupName: string;
  box: Box;
  door: { x: number; y: number };
  color: string;
};

// 坐标按 map-v11.png（wan2.7-image-pro 参考 sample_map_2.jpg 生成）标定
// 注：本图建筑非常密集且大多为通用小镇住宅风格，仅医院红十字标志醒目。
// 其余建筑按位置粗略估计，可在内容管理端进一步微调。
const LOCATIONS: readonly Loc[] = [
  // 家：左上小红顶住宅
  { slug: 'loc-home',    name: '我的家',  groupName: 'home',        color: '#D89531',
    box: { l: 2,  t: 12, r: 22, b: 40 }, door: { x: 12, y: 30 } },
  // 学校：左中长蓝顶大楼
  { slug: 'school',      name: '学校',    groupName: 'school',      color: '#305FBE',
    box: { l: 14, t: 22, r: 36, b: 46 }, door: { x: 24, y: 40 } },
  // 医院：中央红十字白楼（唯一明显标识）
  { slug: 'hospital',    name: '医院',    groupName: 'hospital',    color: '#C95746',
    box: { l: 36, t: 38, r: 56, b: 62 }, door: { x: 46, y: 56 } },
  // 商场：右中现代灰顶平顶建筑
  { slug: 'mall',        name: '商场',    groupName: 'mall',        color: '#6B4D8C',
    box: { l: 38, t: 64, r: 60, b: 88 }, door: { x: 47, y: 80 } },
  // 公园：右上喷泉+绿地
  { slug: 'park',        name: '公园',    groupName: 'park',        color: '#4A8662',
    box: { l: 70, t: 4,  r: 99, b: 28 }, door: { x: 82, y: 22 } },
  // 超市：左下带遮阳篷店面
  { slug: 'supermarket', name: '超市',    groupName: 'supermarket', color: '#D89531',
    box: { l: 8,  t: 60, r: 32, b: 84 }, door: { x: 18, y: 76 } },
  // 游乐场：右下橙色装饰区
  { slug: 'playground',  name: '游乐场',  groupName: 'playground',  color: '#6B4D8C',
    box: { l: 62, t: 70, r: 90, b: 98 }, door: { x: 74, y: 86 } },
];

type LocSlug = (typeof LOCATIONS)[number]['slug'];

const THEME: Record<string, { bg: string; accent: string }> = {
  sun:   { bg: 'rgba(216,149,49,0.10)',  accent: '#D89531' },
  ocean: { bg: 'rgba(48,95,190,0.09)',   accent: '#305FBE' },
  leaf:  { bg: 'rgba(74,134,98,0.09)',   accent: '#4A8662' },
  coral: { bg: 'rgba(201,87,70,0.09)',   accent: '#C95746' },
  berry: { bg: 'rgba(107,77,140,0.09)',  accent: '#6B4D8C' },
  plum:  { bg: 'rgba(107,77,140,0.09)',  accent: '#6B4D8C' },
  amber: { bg: 'rgba(216,149,49,0.10)',  accent: '#D89531' },
};

/* ════════════════════════════════════════════════════════════════
   主页面
════════════════════════════════════════════════════════════════ */
export function ScenesMapPage() {
  const nav = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  /* 平移状态 */
  const offsetRef    = useRef({ x: 0, y: 0 });
  const [offset, setOffset]           = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDragging,  setIsDragging]  = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartRef  = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const dragDistRef   = useRef(0);
  const animTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* 场景数据 */
  const { data: allScenes = [] } = useQuery({
    queryKey: ['public', 'scenes'],
    queryFn: contentApi.scenes,
  });
  const [activeSlug, setActiveSlug] = useState<LocSlug | null>(null);
  const activeLoc  = LOCATIONS.find(l => l.slug === activeSlug) ?? null;
  // 子场景过滤：以 L1 slug 为 groupName，且排除 L1 自身（避免自引用进列表）
  const subScenes  = activeLoc
    ? allScenes.filter(s => s.groupName === activeLoc.slug && s.slug !== activeLoc.slug)
    : [];

  function getSize() {
    const el = containerRef.current;
    if (!el) return { cW: 1280, cH: 720 };
    return { cW: el.clientWidth, cH: el.clientHeight };
  }
  function clamp(ox: number, oy: number) {
    const { cW, cH } = getSize();
    return {
      x: Math.max(cW - cW * MAP_SCALE, Math.min(0, ox)),
      y: Math.max(cH - cH * MAP_SCALE, Math.min(0, oy)),
    };
  }

  /* 初始居中 */
  useEffect(() => {
    requestAnimationFrame(() => {
      const { cW, cH } = getSize();
      if (!cW) return;
      const init = clamp((cW * (1 - MAP_SCALE)) / 2, (cH * (1 - MAP_SCALE)) / 2);
      setOffset(init);
      offsetRef.current = init;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 平滑居中到大门 */
  function centerLoc(loc: Loc) {
    const { cW, cH } = getSize();
    const mW = cW * MAP_SCALE, mH = cH * MAP_SCALE;
    const target = clamp(
      cW / 2 - (loc.door.x / 100) * mW,
      cH / 2 - (loc.door.y / 100) * mH,
    );
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    setIsAnimating(true);
    setOffset(target);
    offsetRef.current = target;
    animTimerRef.current = setTimeout(() => setIsAnimating(false), 650);
  }

  /* 事件 */
  function handleHotspotClick(slug: LocSlug, e: React.MouseEvent) {
    e.stopPropagation();
    const loc = LOCATIONS.find(l => l.slug === slug)!;
    setActiveSlug(slug);
    centerLoc(loc);
  }
  function handleMapClick() {
    if (dragDistRef.current < 5) setActiveSlug(null);
  }
  function onContainerMouseDown(e: React.MouseEvent) {
    dragDistRef.current = 0;
    isDraggingRef.current = true;
    setIsAnimating(false);
    dragStartRef.current = {
      mx: e.clientX, my: e.clientY,
      ox: offsetRef.current.x, oy: offsetRef.current.y,
    };
    e.preventDefault();
  }

  const onMouseMoveRef = useRef<(e: MouseEvent) => void>(() => {});
  onMouseMoveRef.current = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.mx;
    const dy = e.clientY - dragStartRef.current.my;
    dragDistRef.current = Math.hypot(dx, dy);
    if (dragDistRef.current > 3) setIsDragging(true);
    const next = clamp(dragStartRef.current.ox + dx, dragStartRef.current.oy + dy);
    offsetRef.current = next;
    setOffset(next);
  };

  useEffect(() => {
    const move = (e: MouseEvent) => onMouseMoveRef.current(e);
    const up   = () => { isDraggingRef.current = false; setIsDragging(false); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup',   up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup',   up);
    };
  }, []);

  /* 渲染 */
  return (
    /* 使用 .page（padding: 56px 40px 80px; max-width:1440）—— 与知识探索/动手实验保持一致 */
    <div className="page">

      {/* 页眉（同 KnowledgeListPage / ExperimentsPage 规范） */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <div className="eyebrow">／  场景探索</div>
          <h1 style={{ marginTop: 14 }}>选一个地方，<br />开始今天的探索。</h1>
          <p className="lead" style={{ marginTop: 14, maxWidth: 640 }}>
            点击地图上的任意建筑，走进它的内部子场景。拖动地图查看更多区域。
          </p>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: 2, textAlign: 'right' }}>
          CLICK BUILDING · DRAG MAP
        </div>
      </div>

      {/* 地图容器 —— 16:9 + 自适应高度 */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          maxHeight: 'calc(100vh - 320px)',
          borderRadius: 20,
          overflow: 'hidden',
          border: '1px solid var(--hairline)',
          boxShadow: '0 16px 56px rgba(14,26,51,0.13)',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          background: '#6ba84a',
        }}
        onMouseDown={onContainerMouseDown}
        onClick={handleMapClick}
      >
        {/* 内层可移动地图 */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width:  `${MAP_SCALE * 100}%`,
            height: `${MAP_SCALE * 100}%`,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            transition: isAnimating ? 'transform 0.55s cubic-bezier(.22,1,.36,1)' : 'none',
            willChange: 'transform',
          }}
        >
          <img
            src={MAP_URL}
            alt="探索地图"
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', display: 'block',
              pointerEvents: 'none',
            }}
            draggable={false}
          />

          {LOCATIONS.map(loc => (
            <BuildingHotspot
              key={loc.slug}
              loc={loc}
              active={loc.slug === activeSlug}
              onHotspotClick={(e) => handleHotspotClick(loc.slug, e)}
            />
          ))}
        </div>

        {/* 晕影 */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15,
          boxShadow: 'inset 0 0 100px rgba(14,26,51,0.22)',
          borderRadius: 20,
        }} />

        {/* 图例 */}
        <div style={{
          position: 'absolute', bottom: 14, left: 18, zIndex: 20,
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'rgba(255,255,255,0.78)', letterSpacing: 2,
          display: 'flex', gap: 16,
          background: 'rgba(14,26,51,0.35)', padding: '4px 11px',
          borderRadius: 6, backdropFilter: 'blur(6px)',
          pointerEvents: 'none',
        }}>
          <span>SCALE 1:5000</span>
          <span>N ↑</span>
        </div>

        {!activeLoc && (
          <div style={{
            position: 'absolute', bottom: 14, right: 18, zIndex: 20,
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5,
            background: 'rgba(14,26,51,0.28)', padding: '4px 11px',
            borderRadius: 6, backdropFilter: 'blur(6px)',
            pointerEvents: 'none',
          }}>
            拖动地图 · 点击建筑
          </div>
        )}

        <InfoPanel
          location={activeLoc}
          subScenes={subScenes}
          visible={!!activeLoc}
          onClose={() => setActiveSlug(null)}
          onEnterScene={(slug) => nav(`/scenes/${slug}`)}
        />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   建筑热区：
   • 一个绝对定位的矩形覆盖整栋建筑（透明）
   • hover 时显示淡色填充 + 虚线轮廓 → 暗示可点击
   • 选中时显示 3D 立体定位柱（落在 door 位置）
──────────────────────────────────────────────────────────────── */
function BuildingHotspot({ loc, active, onHotspotClick }: {
  loc: Loc;
  active: boolean;
  onHotspotClick: (e: React.MouseEvent) => void;
}) {
  const [hov, setHov] = useState(false);
  const { box, door, color } = loc;
  const w = box.r - box.l;
  const h = box.b - box.t;

  return (
    <>
      {/* 热区矩形（点击交互层） */}
      <div
        style={{
          position: 'absolute',
          left:   `${box.l}%`,
          top:    `${box.t}%`,
          width:  `${w}%`,
          height: `${h}%`,
          zIndex: 7,
          cursor: 'pointer',
          borderRadius: 8,
          border: hov || active
            ? `1.5px dashed ${color}`
            : '1.5px dashed transparent',
          background: hov && !active
            ? `${color}14`
            : 'transparent',
          transition: 'background .18s ease, border-color .18s ease',
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={onHotspotClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        {/* hover 提示名牌（不在选中态显示） */}
        {hov && !active && (
          <div style={{
            position: 'absolute',
            left: '50%', top: -28,
            transform: 'translateX(-50%)',
            background: 'rgba(14,26,51,0.86)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
          }}>
            {loc.name}
            <span style={{
              marginLeft: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              opacity: 0.6,
              letterSpacing: 1,
            }}>OPEN ▸</span>
          </div>
        )}
      </div>

      {/* 选中态 —— 3D 定位柱（落点 = door 位置） */}
      {active && (
        <div
          style={{
            position: 'absolute',
            left: `${door.x}%`,
            top:  `${door.y}%`,
            zIndex: 12,
            pointerEvents: 'none',
          }}
        >
          <ActivePin color={color} />
        </div>
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   选中态 3D 立体定位柱
──────────────────────────────────────────────────────────────── */
function ActivePin({ color }: { color: string }) {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
      {/* 贴地雷达环 */}
      <div style={{
        position: 'absolute',
        left: -26, top: -10,
        perspective: '120px',
        perspectiveOrigin: '26px 10px',
      }}>
        <div style={{
          width: 52, height: 52,
          marginTop: -18,
          animation: 'groundRing 3s linear infinite',
          transformOrigin: 'center center',
        }}>
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="24" stroke={color} strokeWidth="1.2" strokeDasharray="6 4" opacity="0.4"/>
            <circle cx="26" cy="26" r="14" stroke={color} strokeWidth="1.8" opacity="0.6"/>
            <line x1="2"  y1="26" x2="12" y2="26" stroke={color} strokeWidth="0.8" opacity="0.4"/>
            <line x1="40" y1="26" x2="50" y2="26" stroke={color} strokeWidth="0.8" opacity="0.4"/>
            <line x1="26" y1="2"  x2="26" y2="12" stroke={color} strokeWidth="0.8" opacity="0.4"/>
            <line x1="26" y1="40" x2="26" y2="50" stroke={color} strokeWidth="0.8" opacity="0.4"/>
          </svg>
        </div>
      </div>

      {/* 阴影 */}
      <div style={{
        position: 'absolute', left: -12, top: -4,
        animation: 'pinShadow 2s ease-in-out infinite',
        transformOrigin: '12px 4px',
      }}>
        <div style={{
          width: 24, height: 8, borderRadius: '50%',
          background: 'rgba(0,0,0,0.28)',
        }}/>
      </div>

      {/* 浮动 3D 针体 */}
      <div style={{
        position: 'absolute', left: -15, top: -52,
        animation: 'pinFloat 2s ease-in-out infinite',
      }}>
        <div style={{ perspective: '500px', perspectiveOrigin: '15px 13px' }}>
          <div style={{
            animation: 'pinSpin3d 3.5s linear infinite',
            transformOrigin: '15px 13px',
            transformStyle: 'preserve-3d',
          }}>
            <svg width="30" height="48" viewBox="0 0 30 48" fill="none">
              <path
                d="M15 2C9 2 4 6.7 4 12.6c0 8.2 11 30.4 11 30.4S26 20.8 26 12.6C26 6.7 21 2 15 2z"
                fill={color} stroke="white" strokeWidth="1.6"
              />
              <path d="M11 6C8.7 7.8 7.5 10.1 7.5 13"
                stroke="rgba(255,255,255,0.42)" strokeWidth="1.6" strokeLinecap="round"/>
              <circle cx="15" cy="13" r="5.6" fill="white" opacity="0.93"/>
              <circle cx="15" cy="13" r="3.2" fill={color}/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   右侧浮窗（含锁定子场景 UI）
──────────────────────────────────────────────────────────────── */
function InfoPanel({ location, subScenes, visible, onClose, onEnterScene }: {
  location: Loc | null;
  subScenes: PublicScene[];
  visible: boolean;
  onClose: () => void;
  onEnterScene: (slug: string) => void;
}) {
  // 订阅进度 → 物品 KP/视频进度更新时本面板自动重渲染
  const { calcSceneProgress, calcL1Progress } = useProgress();

  const unlockedCount = subScenes.filter(s => !s.unlockHint).length;
  const totalCount    = subScenes.length;

  // 真实 L1 探索度：所有未锁定 L2 进度的平均
  const l1Progress = calcL1Progress(
    subScenes.map(sc => ({ slug: sc.slug, unlockHint: sc.unlockHint, items: sc.items ?? [] })),
  );
  const progressPct = Math.round(l1Progress * 100);
  // 完成数 = 进度 ≥ 99% 的子场景数
  const exploredCount = subScenes.filter(
    sc => !sc.unlockHint && calcSceneProgress(sc.items ?? []) >= 0.99,
  ).length;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: 16, bottom: 16, right: 16,
        width: 340,
        background: 'rgba(248,246,241,0.96)',
        backdropFilter: 'blur(18px)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.72)',
        boxShadow: '0 12px 48px rgba(14,26,51,0.22)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        zIndex: 25,
        transform: visible ? 'translateX(0)' : 'translateX(calc(100% + 32px))',
        transition: 'transform 0.42s cubic-bezier(.22,1,.36,1)',
      }}
    >
      {location && (
        <>
          <div style={{
            padding: '18px 18px 14px',
            borderBottom: '1px solid var(--hairline)',
            background: 'var(--paper)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ width: 26, height: 3, borderRadius: 999, background: location.color, marginBottom: 8 }}/>
                <h3 style={{ margin: 0, fontSize: 26 }}>{location.name}</h3>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 28, height: 28, borderRadius: 999,
                  border: '1px solid var(--hairline)',
                  background: 'var(--bg)', color: 'var(--ink-3)',
                  display: 'grid', placeItems: 'center',
                  cursor: 'pointer', fontSize: 13, flexShrink: 0, marginTop: 2,
                }}
              >×</button>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: 1 }}>
                  整体探索度
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                  {progressPct}%
                </span>
              </div>
              <div style={{ height: 4, background: 'var(--hairline)', borderRadius: 999 }}>
                <div style={{
                  height: '100%', borderRadius: 999,
                  width: `${progressPct}%`,
                  background: location.color,
                  transition: 'width .6s ease',
                  minWidth: progressPct > 0 ? 4 : 0,
                }}/>
              </div>
              <div style={{ marginTop: 5, fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>
                {exploredCount} / {unlockedCount} 已探索 · 共 {totalCount} 区域 {totalCount - unlockedCount > 0 && `（${totalCount - unlockedCount} 锁定）`}
              </div>
            </div>
          </div>

          {/* 子场景列表 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            {subScenes.length === 0 ? (
              <div style={{
                padding: 24, textAlign: 'center',
                color: 'var(--ink-4)', fontFamily: 'var(--font-mono)',
                fontSize: 11, letterSpacing: 2,
              }}>COMING SOON</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {subScenes.map((sc, i) => (
                  <SubSceneRow
                    key={sc.id} scene={sc} index={i}
                    accentColor={location.color}
                    onEnter={() => onEnterScene(sc.slug)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   子场景行（含锁定态样式）
──────────────────────────────────────────────────────────────── */
function SubSceneRow({ scene, index, accentColor: _ac, onEnter }: {
  scene: PublicScene;
  index: number;
  accentColor: string;
  onEnter: () => void;
}) {
  const [hov, setHov] = useState(false);
  const { calcSceneProgress } = useProgress();
  const th = THEME[scene.themeColor ?? ''] ?? { bg: 'rgba(14,26,51,0.05)', accent: 'var(--ink-3)' };
  const itemCount = scene._count?.items ?? 0;
  const isLocked  = !!scene.unlockHint;

  // 该 L2 实际探索度（仅未锁定时计算）
  const l2Progress = isLocked ? 0 : calcSceneProgress(scene.items ?? []);
  const l2Pct = Math.round(l2Progress * 100);

  return (
    <div
      onClick={isLocked ? undefined : onEnter}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 10px', borderRadius: 10,
        border: `1px solid ${hov && !isLocked ? th.accent : 'var(--hairline)'}`,
        background: hov && !isLocked ? th.bg : 'transparent',
        cursor: isLocked ? 'not-allowed' : 'pointer',
        opacity: isLocked ? 0.62 : 1,
        transition: 'border-color .16s, background .16s, opacity .16s',
        position: 'relative',
      }}
    >
      <div style={{
        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
        background: isLocked ? 'rgba(14,26,51,0.08)' : th.bg,
        color: isLocked ? 'var(--ink-4)' : th.accent,
        display: 'grid', placeItems: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
      }}>
        {isLocked
          ? <LockIcon />
          : String(index + 1).padStart(2, '0')
        }
      </div>

      <div style={{
        width: 44, height: 32, borderRadius: 6,
        flexShrink: 0, background: th.bg, overflow: 'hidden',
        filter: isLocked ? 'grayscale(1)' : 'none',
      }}>
        {scene.sceneImageUrl
          ? <img src={scene.sceneImageUrl} alt={scene.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          : <ThumbIcon color={th.accent}/>
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600,
          color: isLocked ? 'var(--ink-3)' : 'var(--ink)',
          lineHeight: 1.2, fontFamily: 'var(--font-display)',
        }}>{scene.name}</div>
        {isLocked ? (
          <div style={{
            marginTop: 2, fontSize: 10,
            color: 'var(--ink-4)', lineHeight: 1.3,
          }}>
            🔒 {scene.unlockHint}
          </div>
        ) : itemCount > 0 ? (
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* L2 探索度迷你进度条 */}
            <div style={{ flex: 1, height: 3, background: 'var(--hairline)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                width: `${l2Pct}%`,
                height: '100%',
                background: l2Pct >= 99 ? 'var(--L1)' : th.accent,
                transition: 'width .4s ease',
              }}/>
            </div>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9,
              color: l2Pct > 0 ? th.accent : 'var(--ink-4)',
              letterSpacing: 0.5, minWidth: 30, textAlign: 'right',
            }}>{l2Pct}%</span>
          </div>
        ) : null}
      </div>

      {!isLocked && (
        <span style={{
          color: hov ? th.accent : 'var(--ink-4)',
          fontSize: 12, flexShrink: 0, transition: 'color .16s',
        }}>→</span>
      )}
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="2.5" y="5.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4 5.5V4a2 2 0 014 0v1.5" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}

function ThumbIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 44 32" style={{ width: '100%', height: '100%' }}>
      <path d="M 2 30 L 2 10 L 22 3 L 42 10 L 42 30 Z" fill={color} opacity="0.12"/>
      <rect x="14" y="15" width="16" height="15" rx="2" fill={color} opacity="0.22"/>
      <path d="M 9 10 L 22 4 L 35 10" fill={color} opacity="0.18"/>
    </svg>
  );
}
