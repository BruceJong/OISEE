import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { contentApi } from '@/api/content';
import { useProgress } from '@/utils/progress';

export function SceneDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const [hover, setHover] = useState<string | null>(null);

  const { calcItemProgress, calcSceneProgress } = useProgress();

  const { data: scene, isLoading: sl } = useQuery({
    queryKey: ['public', 'scene', slug],
    queryFn: () => contentApi.sceneBySlug(slug!),
    enabled: !!slug,
  });

  if (sl) return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', letterSpacing: 2 }}>
      LOADING...
    </div>
  );
  if (!scene) return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>场景不存在</div>;

  const items = scene.items ?? [];
  const sceneProgress = calcSceneProgress(items as any);
  const itemsExplored = items.filter((it: any) => calcItemProgress(it) >= 0.99).length;

  return (
    /*
      整页约束高度：100vh − navbar (≈72) − 上下 padding。
      flex 列布局：紧凑页眉 + 主区填满；主区内部左右栅格，右栏滚动。
    */
    <div style={{
      maxWidth: 1440, margin: '0 auto', padding: '24px 40px 24px',
      height: 'calc(100vh - 72px)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── 紧凑页眉 ───────────────────────────────────── */}
      <div style={{ flexShrink: 0, marginBottom: 16 }}>
        <button
          onClick={() => nav('/scenes')}
          style={{
            background: 'transparent', border: 'none', color: 'var(--ink-3)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            padding: '4px 0', display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 14 }}>←</span> 返回地图
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
          <div style={{ maxWidth: 720 }}>
            <div className="eyebrow">／  场景探索 · {scene.name}</div>
            <h2 style={{ marginTop: 6, fontSize: 32, lineHeight: 1.1, letterSpacing: '-0.01em', fontFamily: 'var(--font-display)' }}>
              {scene.name}
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              {scene.description}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 32 }}>
            <div className="font-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: 2, marginBottom: 5 }}>
              EXPLORATION · 整体探索度
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-end' }}>
              <div style={{ width: 180, height: 4, background: 'var(--hairline)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.round(sceneProgress * 100)}%`, height: '100%',
                  background: 'var(--amber)', transition: 'width .4s ease',
                }}/>
              </div>
              <span className="font-mono" style={{ fontSize: 13, fontWeight: 600, minWidth: 38, textAlign: 'right' }}>
                {Math.round(sceneProgress * 100)}%
              </span>
            </div>
            <div style={{ marginTop: 4, fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
              {itemsExplored} / {items.length} 件物品已完成
            </div>
          </div>
        </div>
      </div>

      {/* ── 左右栅格 ─────────────────────────────────────
           左：2.5D 场景图按原比 (1:1)，由高度决定宽度
           右：剩余空间放储物格物品列表，超出滚动
      ──────────────────────────────────────────────── */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex',
        gap: 24,
        alignItems: 'stretch',
      }}>
        {/* === 左：2.5D 场景图（原比 1:1）+ 热点 === */}
        <div style={{
          aspectRatio: '1 / 1',
          height: '100%',
          maxWidth: '60%',                     // 防止超宽屏吃掉右栏
          flexShrink: 0,
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          background: 'var(--bg-2)',
          border: '1px solid var(--hairline)',
          boxShadow: '0 12px 36px rgba(14,26,51,0.10)',
        }}>
          {scene.sceneImageUrl ? (
            <>
              <img
                src={scene.sceneImageUrl}
                alt={scene.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {items.map((item: any) => {
                const pos = item.scenePosition as { x: number; y: number } | null;
                if (!pos) return null;
                const prog = calcItemProgress(item);
                const done = prog >= 0.99;
                return (
                  <div
                    key={item.id}
                    style={{
                      position: 'absolute',
                      left: `${pos.x}%`, top: `${pos.y}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: hover === item.id ? 10 : 1,
                    }}
                    onMouseEnter={() => setHover(item.id)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <Link
                      to={`/items/${item.slug}`}
                      state={{ backStack: [{ url: `/scenes/${scene.slug}`, label: scene.name }] }}
                      style={{ textDecoration: 'none', display: 'block' }}
                    >
                      <HotspotMarker progress={prog} done={done} active={hover === item.id} />
                      {hover === item.id && (
                        <div style={{
                          position: 'absolute', bottom: '130%', left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'var(--ink)', color: 'var(--paper)',
                          borderRadius: 8, padding: '8px 12px',
                          width: 180, whiteSpace: 'normal',
                          boxShadow: '0 4px 16px rgba(14,26,51,0.25)',
                          fontSize: 12, fontWeight: 600,
                          textAlign: 'left',
                        }}>
                          <div>{item.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--amber)', marginTop: 3, fontWeight: 400 }}>
                            {item.shortDesc}
                          </div>
                          <div style={{
                            marginTop: 6,
                            fontFamily: 'var(--font-mono)', fontSize: 9,
                            color: 'rgba(255,255,255,0.65)', letterSpacing: 1,
                          }}>
                            探索度 {Math.round(prog * 100)}%
                          </div>
                          <div style={{
                            position: 'absolute', bottom: -6, left: '50%',
                            transform: 'translateX(-50%)',
                            width: 12, height: 12, background: 'var(--ink)',
                            clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                          }}/>
                        </div>
                      )}
                    </Link>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="placeholder" style={{ width: '100%', height: '100%', padding: 40 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 12 }}>🎨</div>
                <div>场景插图正在生成中…</div>
              </div>
            </div>
          )}
        </div>

        {/* === 右：储物格物品网格（内部滚动） === */}
        <div style={{
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column',
          background: 'var(--paper)',
          borderRadius: 16,
          border: '1px solid var(--hairline)',
          overflow: 'hidden',
          minHeight: 0,
        }}>
          <div style={{
            padding: '12px 16px 10px',
            borderBottom: '1px solid var(--hairline)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            flexShrink: 0,
          }}>
            <h4 style={{ margin: 0, fontSize: 15 }}>{scene.name}里的物品</h4>
            <span className="font-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: 2 }}>
              {items.length} ITEMS
            </span>
          </div>

          {/* 储物格：auto-fill 自适应列数，超出滚动 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, minHeight: 0 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))',
              gap: 10,
            }}>
              {items.map((item: any) => (
                <ItemTile
                  key={item.id}
                  item={item}
                  sceneSlug={scene.slug}
                  sceneName={scene.name}
                  progress={calcItemProgress(item)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 储物格物品块（一格） */
function ItemTile({ item, sceneSlug, sceneName, progress }: {
  item: any; sceneSlug: string; sceneName: string; progress: number;
}) {
  const [hov, setHov] = useState(false);
  const done = progress >= 0.99;
  const pct = Math.round(progress * 100);

  return (
    <Link
      to={`/items/${item.slug}`}
      state={{ backStack: [{ url: `/scenes/${sceneSlug}`, label: sceneName }] }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', flexDirection: 'column',
        padding: 8,
        borderRadius: 10,
        border: `1px solid ${hov ? 'var(--amber)' : 'var(--hairline)'}`,
        background: hov ? 'rgba(216,149,49,0.06)' : 'var(--paper)',
        textDecoration: 'none', color: 'inherit',
        transition: 'border-color .15s, background .15s, transform .15s',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hov ? '0 6px 14px rgba(14,26,51,0.10)' : 'none',
        position: 'relative',
      }}
    >
      {/* 缩略图（正方形） */}
      <div style={{
        aspectRatio: '1 / 1',
        borderRadius: 6,
        overflow: 'hidden',
        background: 'var(--bg-2)',
        position: 'relative',
      }}>
        {item.itemImageUrl ? (
          <img src={item.itemImageUrl} alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 24, opacity: 0.4 }}>🔧</div>
        )}
        {/* 状态徽章浮于右上 */}
        <span style={{
          position: 'absolute', top: 4, right: 4,
          fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
          padding: '2px 6px', borderRadius: 999,
          background: done ? 'var(--ink)' : 'rgba(255,255,255,0.92)',
          color: done ? 'var(--paper)' : (pct > 0 ? 'var(--amber)' : 'var(--ink-3)'),
          border: done ? 'none' : `1px solid ${pct > 0 ? 'var(--amber)' : 'var(--hairline)'}`,
          boxShadow: '0 1px 3px rgba(14,26,51,0.10)',
          lineHeight: 1.1,
        }}>
          {done ? '✓' : `${pct}%`}
        </span>
      </div>

      {/* 名称 */}
      <div style={{
        marginTop: 6,
        fontSize: 12, fontWeight: 600, color: 'var(--ink)',
        lineHeight: 1.25,
        overflow: 'hidden', textOverflow: 'ellipsis',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
        minHeight: 30,
      }}>
        {item.name}
      </div>

      {/* 迷你进度条 */}
      <div style={{ marginTop: 4, height: 2, background: 'var(--hairline)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: done ? 'var(--L1)' : 'var(--amber)',
          transition: 'width .4s ease',
        }}/>
      </div>
    </Link>
  );
}

/* 热点标记 */
function HotspotMarker({ progress, done, active }: { progress: number; done: boolean; active: boolean }) {
  const size = active ? 44 : 36;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const dash = C * progress;

  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: done ? 'var(--amber)' : 'rgba(255,255,255,0.95)',
      display: 'grid', placeItems: 'center',
      cursor: 'pointer',
      transition: 'all .2s ease',
      boxShadow: active
        ? `0 0 0 4px rgba(216,149,49,0.3), 0 4px 12px rgba(14,26,51,0.2)`
        : '0 2px 8px rgba(14,26,51,0.18)',
      position: 'relative',
    }}>
      {!done && progress > 0 && (
        <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r}
            stroke="var(--amber)" strokeWidth={stroke} fill="none"
            strokeDasharray={`${dash} ${C - dash}`} strokeLinecap="round"/>
        </svg>
      )}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: `2px solid ${done ? 'var(--amber)' : 'var(--ink)'}`,
        opacity: done ? 0 : 0.85,
      }}/>
      {done ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5L6.5 12L13 4.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      )}
    </div>
  );
}
