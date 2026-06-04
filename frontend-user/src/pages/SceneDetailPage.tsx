import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { contentApi } from '@/api/content';
import { useProgress } from '@/utils/progress';

export function SceneDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const [hover, setHover] = useState<string | null>(null);

  // 订阅进度变化 → 任何 KP 阅读 / 视频观看进度更新都会触发本页面重渲染
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

  // ── 真实进度计算 ──
  const sceneProgress = calcSceneProgress(items as any);
  const itemsExplored = items.filter((it: any) => calcItemProgress(it) >= 0.99).length;

  return (
    <div>
      <div className="page" style={{ paddingBottom: 32 }}>
        <button
          onClick={() => nav('/scenes')}
          style={{
            background: 'transparent', border: 'none', color: 'var(--ink-3)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '8px 0',
            display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 14 }}>←</span> 返回地图
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 20 }}>
          <div>
            <div className="eyebrow">／  场景探索 · {scene.name}</div>
            <h1 style={{ marginTop: 14 }}>{scene.name}</h1>
            <p className="lead" style={{ marginTop: 14, maxWidth: 540 }}>{scene.description}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 2, marginBottom: 8 }}>
              EXPLORATION · 整体探索度
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'flex-end' }}>
              <div style={{ width: 220, height: 4, background: 'var(--hairline)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.round(sceneProgress * 100)}%`,
                  height: '100%',
                  background: 'var(--amber)',
                  transition: 'width .4s ease',
                }}/>
              </div>
              <span className="font-mono" style={{ fontSize: 14, fontWeight: 600, minWidth: 42, textAlign: 'right' }}>
                {Math.round(sceneProgress * 100)}%
              </span>
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
              {itemsExplored} / {items.length} 件物品已完成
            </div>
          </div>
        </div>
      </div>

      {/* ── 2.5D 场景图 + 物品热点 ── */}
      <div style={{ background: 'var(--paper)', borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 40px' }}>
          {scene.sceneImageUrl ? (
            <div style={{
              position: 'relative',
              aspectRatio: '1 / 1',   // 与生成的 1024×1024 等比
              maxHeight: '70vh',
              margin: '0 auto',
              borderRadius: 16, overflow: 'hidden',
              background: 'var(--bg-2)',
              border: '1px solid var(--hairline)',
              boxShadow: '0 12px 36px rgba(14,26,51,0.10)',
            }}>
              <img
                src={scene.sceneImageUrl}
                alt={scene.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* 物品热点 */}
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
                    <Link to={`/items/${item.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                      <HotspotMarker
                        progress={prog}
                        done={done}
                        active={hover === item.id}
                      />
                      {hover === item.id && (
                        <div style={{
                          position: 'absolute', bottom: '130%', left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'var(--ink)', color: 'var(--paper)',
                          borderRadius: 8, padding: '10px 14px',
                          width: 200, whiteSpace: 'normal',
                          boxShadow: '0 4px 16px rgba(14,26,51,0.25)',
                          fontSize: 13, fontWeight: 600,
                          textAlign: 'left',
                        }}>
                          <div>{item.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 4, fontWeight: 400 }}>
                            {item.shortDesc}
                          </div>
                          <div style={{
                            marginTop: 8,
                            fontFamily: 'var(--font-mono)', fontSize: 10,
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
            </div>
          ) : (
            <div className="placeholder" style={{ aspectRatio: '1 / 1', maxHeight: '60vh', padding: 40 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 12 }}>🎨</div>
                <div>场景插图正在生成中…</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 物品列表 + 每项进度条 ── */}
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 48, marginBottom: 28 }}>
          <h3>{scene.name}里的全部物品</h3>
          <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 2 }}>
            {items.length} ITEMS
          </span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 16,
        }}>
          {items.map((item: any) => {
            const prog = calcItemProgress(item);
            const kpsCnt = item.knowledgePoints?.length ?? 0;
            return (
              <Link
                key={item.id}
                to={`/items/${item.slug}`}
                className="card lift"
                style={{
                  padding: 18,
                  display: 'flex', flexDirection: 'column',
                  gap: 10,
                  textDecoration: 'none', color: 'inherit',
                  position: 'relative',
                }}
              >
                {item.itemImageUrl ? (
                  <img src={item.itemImageUrl} alt={item.name}
                    style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 8 }}/>
                ) : (
                  <div style={{
                    width: '100%', aspectRatio: '4 / 3',
                    background: 'var(--bg-2)', borderRadius: 8,
                    display: 'grid', placeItems: 'center',
                    fontSize: 28, opacity: 0.4,
                  }}>🔧</div>
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.4 }}>
                    {item.shortDesc}
                  </div>
                </div>
                <div style={{ marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-3)', letterSpacing: 1 }}>
                      {kpsCnt} KPS
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: prog > 0 ? 'var(--amber)' : 'var(--ink-4)' }}>
                      {Math.round(prog * 100)}%
                    </span>
                  </div>
                  <div style={{ height: 3, background: 'var(--hairline)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.round(prog * 100)}%`,
                      height: '100%',
                      background: prog >= 0.99 ? 'var(--green, #4A8662)' : 'var(--amber)',
                      transition: 'width .4s ease',
                    }}/>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   场景图上的热点标记
   • 外圈是 SVG 进度环
   • 内圈是状态图标（探索中 / 已完成 ✓）
──────────────────────────────────────────────────────────────── */
function HotspotMarker({ progress, done, active }: { progress: number; done: boolean; active: boolean }) {
  const size = active ? 48 : 40;
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
      {/* SVG 进度环 */}
      {!done && progress > 0 && (
        <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r}
            stroke="var(--amber)" strokeWidth={stroke} fill="none"
            strokeDasharray={`${dash} ${C - dash}`}
            strokeLinecap="round"/>
        </svg>
      )}
      {/* 边框 */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: `2px solid ${done ? 'var(--amber)' : 'var(--ink)'}`,
        opacity: done ? 0 : 0.85,
      }}/>
      {/* 中央图标 */}
      {done ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5L6.5 12L13 4.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      )}
    </div>
  );
}
