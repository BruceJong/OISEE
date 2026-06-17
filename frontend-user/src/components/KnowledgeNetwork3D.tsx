/**
 * 知识网络 3D 可视化
 *
 * - 节点 = 知识点；按 Fibonacci 球面均匀分布在单位球面上
 * - 节点大小 ∝ 关联物品数（itemCount）
 * - 边 = KnowledgeRelation（双向去重）
 * - 鼠标拖拽 → 绕 X/Y 轴旋转整个球面
 * - 点击节点 → 弹窗显示该 KP 的信息 + "查看详情" 入口
 * - 纯 SVG + 自实现 3D 变换，零额外依赖
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicKnowledgeNetwork } from '@/api/content';
import { backState } from '@/utils/back-nav';

type NodeIn = PublicKnowledgeNetwork['nodes'][number];

/* ── 学科主题色（与列表卡片一致） ── */
const SUBJECT_COLOR: Record<string, string> = {
  PHYSICS: '#305FBE', CHEMISTRY: '#C95746', BIOLOGY: '#4A8662', GEOGRAPHY: '#8C6B2A', OTHER: '#6B4D8C',
};
const SUBJECT_LABEL: Record<string, string> = {
  PHYSICS: '物理', CHEMISTRY: '化学', BIOLOGY: '生物', GEOGRAPHY: '地理', OTHER: '其他',
};

/* ── Fibonacci 球面分布：把 N 个点均匀洒在单位球面上 ── */
function fibonacciSphere(n: number): Array<{ x: number; y: number; z: number }> {
  const pts = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(n - 1, 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
  }
  return pts;
}

/* ── 绕 X / Y 轴旋转 3D 点 ── */
function rotateXY(p: { x: number; y: number; z: number }, yaw: number, pitch: number) {
  // yaw 绕 Y 轴
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  let x = p.x * cy + p.z * sy;
  let z = -p.x * sy + p.z * cy;
  // pitch 绕 X 轴
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  let y = p.y * cp - z * sp;
  z = p.y * sp + z * cp;
  return { x, y, z };
}

export function KnowledgeNetwork3D({ data, height = 560 }: {
  data: PublicKnowledgeNetwork;
  height?: number;
}) {
  const nav = useNavigate();
  const { nodes, edges } = data;

  /* ── 3D 旋转状态（弧度） ── */
  const [yaw, setYaw]     = useState(0);
  const [pitch, setPitch] = useState(0);
  const dragRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  /* ── 自动缓动旋转（无操作时）—— 0.0015 rad/帧 ≈ 5°/sec ── */
  const [autoSpin, setAutoSpin] = useState(true);
  useEffect(() => {
    if (!autoSpin) return;
    let raf = 0;
    const tick = () => {
      setYaw(y => y + 0.0025);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoSpin]);

  /* ── 鼠标交互：拖拽旋转 ── */
  const svgRef = useRef<SVGSVGElement>(null);
  /* 500ms 空闲后恢复自动旋转的定时器 */
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelResume = () => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  };
  const scheduleResume = () => {
    cancelResume();
    resumeTimerRef.current = setTimeout(() => setAutoSpin(true), 500);
  };

  const onMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    cancelResume();
    setAutoSpin(false);
    dragRef.current = { x: e.clientX, y: e.clientY, yaw, pitch };
  };
  useEffect(() => {
    function move(e: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      setYaw(d.yaw + dx * 0.008);
      // 上下方向：往下拖应该让上半部"翻"过来 → pitch 减少（取反 dy）
      setPitch(Math.max(-Math.PI / 2, Math.min(Math.PI / 2, d.pitch - dy * 0.008)));
    }
    function up() {
      if (dragRef.current) {
        dragRef.current = null;
        scheduleResume();
      }
    }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      cancelResume();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 节点 3D 位置 & 大小映射 ── */
  const layout = useMemo(() => {
    const sphere = fibonacciSphere(nodes.length);
    const counts = nodes.map(n => n.itemCount);
    const maxC = Math.max(1, ...counts);
    const idMap: Record<string, number> = {};
    nodes.forEach((n, i) => { idMap[n.id] = i; });
    return { sphere, maxC, idMap };
  }, [nodes]);

  /* ── 当前帧投影 ── */
  const projected = useMemo(() => {
    return nodes.map((n, i) => {
      const r = rotateXY(layout.sphere[i]!, yaw, pitch);
      const size = 5 + (n.itemCount / layout.maxC) * 18; // 5..23
      const depth = (r.z + 1) / 2;                       // 0(back) .. 1(front)
      return { node: n, x: r.x, y: r.y, z: r.z, size, depth };
    });
  }, [nodes, layout, yaw, pitch]);

  /* ── 去重双向边（A→B / B→A 视为同一条） ── */
  const uniqEdges = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ fromId: string; toId: string }> = [];
    for (const e of edges) {
      const key = e.fromId < e.toId ? `${e.fromId}|${e.toId}` : `${e.toId}|${e.fromId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
    return out;
  }, [edges]);

  /* ── 弹窗状态 ── */
  const [picked, setPicked] = useState<NodeIn | null>(null);

  /* ── SVG 投影坐标系：[-1.4, 1.4] —— 留点边距 ── */
  const VIEW = 1.4;
  const SCALE = 100; // SVG 单位/世界单位

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: 16, overflow: 'hidden',
      background: 'radial-gradient(ellipse at center, #1A2B4D 0%, #0E1A33 80%, #06101F 100%)',
      border: '1px solid var(--hairline)',
      boxShadow: '0 12px 36px rgba(14,26,51,0.18)',
      cursor: dragRef.current ? 'grabbing' : 'grab',
      userSelect: 'none',
    }}>
      <svg
        ref={svgRef}
        viewBox={`${-VIEW * SCALE} ${-VIEW * SCALE} ${2 * VIEW * SCALE} ${2 * VIEW * SCALE}`}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onMouseDown={onMouseDown}
      >
        {/* 背景星点 */}
        <g opacity="0.35">
          {Array.from({ length: 40 }).map((_, i) => {
            const a = (i / 40) * Math.PI * 2;
            const r = (i % 7) * 22 + 30;
            return (
              <circle
                key={i}
                cx={Math.cos(a) * r}
                cy={Math.sin(a) * r}
                r={0.6}
                fill="#fff"
              />
            );
          })}
        </g>

        {/* 边：先画，被节点覆盖；按双方深度均值排序 */}
        <g>
          {uniqEdges
            .map(e => {
              const ai = layout.idMap[e.fromId];
              const bi = layout.idMap[e.toId];
              if (ai == null || bi == null) return null;
              const a = projected[ai]!;
              const b = projected[bi]!;
              const meanDepth = (a.depth + b.depth) / 2;
              const opacity = 0.15 + meanDepth * 0.35;
              return { a, b, opacity, key: `${e.fromId}|${e.toId}`, meanDepth };
            })
            .filter(Boolean)
            .sort((x, y) => x!.meanDepth - y!.meanDepth)
            .map(e => (
              <line
                key={e!.key}
                x1={e!.a.x * SCALE} y1={e!.a.y * SCALE}
                x2={e!.b.x * SCALE} y2={e!.b.y * SCALE}
                stroke="#ffffff"
                strokeWidth={0.4 + e!.meanDepth * 0.8}
                opacity={e!.opacity}
              />
            ))}
        </g>

        {/* 节点：按 z 升序绘制（远在底，近在顶） */}
        <g>
          {projected
            .slice()
            .sort((a, b) => a.z - b.z)
            .map(p => {
              const color = SUBJECT_COLOR[p.node.subject] ?? '#305FBE';
              const opacity = 0.45 + p.depth * 0.55;
              const r = p.size * (0.55 + p.depth * 0.45);
              return (
                <g
                  key={p.node.id}
                  onClick={() => setPicked(p.node)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* 光晕（远的节点暗） */}
                  <circle
                    cx={p.x * SCALE} cy={p.y * SCALE}
                    r={r * 1.6}
                    fill={color}
                    opacity={0.15 * p.depth}
                  />
                  {/* 节点本体 */}
                  <circle
                    cx={p.x * SCALE} cy={p.y * SCALE}
                    r={r}
                    fill={color}
                    opacity={opacity}
                    stroke="#fff"
                    strokeOpacity={0.35 + p.depth * 0.4}
                    strokeWidth={0.6}
                  />
                  {/* 标签：只对前景大节点显示，避免视觉杂乱 */}
                  {p.depth > 0.55 && p.node.itemCount >= Math.max(1, layout.maxC * 0.35) && (
                    <text
                      x={p.x * SCALE}
                      y={p.y * SCALE + r + 9}
                      textAnchor="middle"
                      fill="#fff"
                      opacity={p.depth}
                      fontSize={9}
                      fontFamily="-apple-system, sans-serif"
                      pointerEvents="none"
                    >
                      {p.node.name}
                    </text>
                  )}
                </g>
              );
            })}
        </g>
      </svg>

      {/* HUD：操作说明 + 自动旋转开关 + 节点统计 */}
      <div style={{
        position: 'absolute', top: 16, left: 16, color: '#fff',
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1.5,
        opacity: 0.7, pointerEvents: 'none',
      }}>
        KNOWLEDGE NETWORK · {nodes.length} NODES · {uniqEdges.length} EDGES
      </div>
      <div style={{
        position: 'absolute', top: 16, right: 16,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => setAutoSpin(s => !s)}
          style={{
            padding: '5px 12px', borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.10)',
            color: '#fff',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1.5,
            cursor: 'pointer', backdropFilter: 'blur(8px)',
          }}
        >
          {autoSpin ? '⏸ 暂停旋转' : '▶ 自动旋转'}
        </button>
      </div>
      <div style={{
        position: 'absolute', bottom: 16, left: 16, color: 'rgba(255,255,255,0.6)',
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1.5,
        pointerEvents: 'none',
      }}>
        拖拽旋转 · 点击节点查看
      </div>

      {/* 节点点击弹窗 */}
      {picked && (
        <div
          className="modal-mask"
          onClick={() => setPicked(null)}
          style={{ zIndex: 200 }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: 28, maxWidth: 480, width: '90vw' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div>
                <div className="font-mono" style={{
                  fontSize: 10, color: SUBJECT_COLOR[picked.subject] ?? '#305FBE',
                  letterSpacing: 2, marginBottom: 6,
                }}>
                  {SUBJECT_LABEL[picked.subject] ?? picked.subject} · {picked.difficulty}
                </div>
                <h3 style={{ margin: 0, fontSize: 24 }}>{picked.name}</h3>
              </div>
              <button
                onClick={() => setPicked(null)}
                style={{
                  width: 30, height: 30, borderRadius: 999,
                  border: '1px solid var(--hairline)',
                  background: 'var(--bg)', color: 'var(--ink-3)',
                  cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 14,
                }}
              >×</button>
            </div>

            {picked.summary && (
              <p style={{ margin: '16px 0 0', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7 }}>
                {picked.summary}
              </p>
            )}

            <div style={{
              marginTop: 18, padding: '12px 14px',
              background: 'var(--bg)', borderRadius: 8,
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)',
              letterSpacing: 1, display: 'flex', justifyContent: 'space-between',
            }}>
              <span>关联物品 <b style={{ color: 'var(--ink)' }}>{picked.itemCount}</b></span>
              <span>节点大小 ∝ 关联物品数</span>
            </div>

            <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPicked(null)}
                style={{
                  padding: '8px 16px', borderRadius: 999,
                  border: '1px solid var(--hairline)', background: 'var(--bg)',
                  color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                }}
              >返回网络</button>
              <button
                onClick={() => {
                  const s = picked.slug;
                  setPicked(null);
                  nav(`/knowledge/${s}`, { state: backState('/knowledge', '知识库') });
                }}
                style={{
                  padding: '8px 18px', borderRadius: 999,
                  border: 'none', background: 'var(--ink)',
                  color: 'var(--paper)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                }}
              >查看详情 →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
