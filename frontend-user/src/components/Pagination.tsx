import { useMemo } from 'react';

/**
 * 通用分页组件
 *
 * 用法：
 *   const [page, setPage] = useState(1);
 *   const PAGE = 20;
 *   const total = list.length;
 *   const slice = list.slice((page-1)*PAGE, page*PAGE);
 *
 *   <Pagination page={page} pageSize={PAGE} total={total} onChange={setPage} />
 *
 * 规则：
 *   - 当前页 ± 1 显示数字按钮
 *   - 首/末页固定显示
 *   - 中间跳过用 …
 *   - prev / next 在两端
 *   - 单页或空时不渲染
 *   - 切页时不动滚动（由 AppShell 的 ScrollToTop 处理路由，但翻页不切路由）
 *     → 这里 onChange 会触发翻页，调用方可自行 scrollTo(0,0)
 */
export function Pagination({ page, pageSize, total, onChange }: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  // 计算要显示的页码列表：[1, '…', cur-1, cur, cur+1, '…', last]
  const items = useMemo<Array<number | 'gap'>>(() => {
    if (pages <= 7) {
      return Array.from({ length: pages }, (_, i) => i + 1);
    }
    const set = new Set<number>([1, pages, page - 1, page, page + 1]);
    if (page <= 3) [2, 3, 4].forEach(p => set.add(p));
    if (page >= pages - 2) [pages - 1, pages - 2, pages - 3].forEach(p => set.add(p));
    const arr = [...set].filter(p => p >= 1 && p <= pages).sort((a, b) => a - b);
    const result: Array<number | 'gap'> = [];
    for (let i = 0; i < arr.length; i++) {
      const cur = arr[i]!;
      result.push(cur);
      const next = arr[i + 1];
      if (next !== undefined && next - cur > 1) result.push('gap');
    }
    return result;
  }, [page, pages]);

  if (total === 0 || pages <= 1) return null;

  function go(p: number) {
    if (p < 1 || p > pages || p === page) return;
    onChange(p);
    // 翻页后让页面回到列表顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div style={{
      marginTop: 40,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16,
    }}>
      <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 2 }}>
        PAGE {page} / {pages} · 共 {total} 条
      </span>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <PageBtn disabled={page === 1} onClick={() => go(page - 1)} label="← 上一页"/>
        {items.map((it, i) =>
          it === 'gap' ? (
            <span key={`g${i}`} style={{ padding: '0 4px', color: 'var(--ink-4)' }}>…</span>
          ) : (
            <PageNumBtn key={it} active={it === page} onClick={() => go(it)}>{it}</PageNumBtn>
          )
        )}
        <PageBtn disabled={page === pages} onClick={() => go(page + 1)} label="下一页 →"/>
      </div>
    </div>
  );
}

function PageBtn({ disabled, onClick, label }: { disabled: boolean; onClick: () => void; label: string }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '8px 14px',
        border: '1px solid var(--hairline)',
        background: 'transparent',
        color: disabled ? 'var(--ink-4)' : 'var(--ink-2)',
        fontSize: 13,
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        opacity: disabled ? 0.55 : 1,
        transition: 'border-color .15s, color .15s',
      }}
    >{label}</button>
  );
}

function PageNumBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        minWidth: 34,
        padding: '7px 11px',
        border: `1px solid ${active ? 'var(--ink)' : 'var(--hairline)'}`,
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? 'var(--paper)' : 'var(--ink-2)',
        fontSize: 13, fontWeight: active ? 700 : 500,
        borderRadius: 8,
        cursor: 'pointer',
        fontFamily: 'var(--font-mono)',
        transition: 'background .15s, border-color .15s',
      }}
    >{children}</button>
  );
}
