import { useLayoutEffect, useRef, useState } from 'react';

/**
 * 单行容纳排版：
 *   - 子元素水平排列，**不换行**
 *   - 隐藏测量层渲染全部子元素并量宽度，按容器实际宽度决定多少个能放下
 *   - 容器宽度变化时（窗口缩放、栅格变化）自动重算
 *   - 通过 onOverflowChange 回调把"完全放不下的剩余条数"告诉外层（用于显示"查看更多"）
 *
 * 使用：
 *   <FitOneRow
 *     items={list}
 *     gap={6}
 *     renderItem={(it, i) => <Chip key={it.id} ... />}
 *     onOverflowChange={(overflow) => setOverflow(overflow)}
 *   />
 */
export function FitOneRow<T>({ items, gap = 6, renderItem, onOverflowChange }: {
  items: T[];
  gap?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  onOverflowChange?: (overflow: number) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [fitCount, setFitCount] = useState(items.length);
  const lastOverflowRef = useRef(0);

  const recompute = () => {
    const wrap = wrapperRef.current;
    const measure = measureRef.current;
    if (!wrap || !measure) return;
    const W = wrap.offsetWidth;
    if (W <= 0) return;
    const kids = Array.from(measure.children) as HTMLElement[];
    let acc = 0;
    let n = 0;
    for (let i = 0; i < kids.length; i++) {
      const w = kids[i]!.offsetWidth;
      const next = i === 0 ? w : acc + gap + w;
      if (next > W) break;
      acc = next;
      n = i + 1;
    }
    setFitCount(prev => (prev === n ? prev : n));
    const overflow = Math.max(0, items.length - n);
    if (overflow !== lastOverflowRef.current) {
      lastOverflowRef.current = overflow;
      onOverflowChange?.(overflow);
    }
  };

  // Run after layout pass + on items change
  useLayoutEffect(recompute, [items, gap]);

  // ResizeObserver for container resize (window resize / parent grid change)
  useLayoutEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver(recompute);
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      {/* Hidden measurement layer — all items, in actual flex order */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          visibility: 'hidden', pointerEvents: 'none',
          display: 'flex', flexWrap: 'nowrap', gap,
        }}
      >
        {items.map((it, i) => renderItem(it, i))}
      </div>
      {/* Visible row — only the count that fits */}
      <div style={{ display: 'flex', flexWrap: 'nowrap', gap, overflow: 'hidden' }}>
        {items.slice(0, fitCount).map((it, i) => renderItem(it, i))}
      </div>
    </div>
  );
}
