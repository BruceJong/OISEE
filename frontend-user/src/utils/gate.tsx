/**
 * 匿名门禁工具
 * - ANON_LIMIT：匿名用户每个模块可见的条数
 * - useDetailGate：详情页深链拦截 —— 匿名用户只允许访问各模块「前 N 条」，
 *   其余直接重定向到登录页。复用列表接口（react-query 缓存），开销小。
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { contentApi } from '@/api/content';
import { useAuth } from '@/utils/auth';

export const ANON_LIMIT = 3;

export type GatedModule = 'items' | 'knowledge' | 'experiments';

const MODULE_QUERY: Record<GatedModule, { key: unknown[]; fn: () => Promise<Array<{ slug: string }>> }> = {
  items: { key: ['public', 'items'], fn: contentApi.items },
  knowledge: { key: ['public', 'kps'], fn: () => contentApi.knowledgeList({}) },
  experiments: { key: ['public', 'experiments'], fn: contentApi.experimentList },
};

function GateLoading() {
  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', letterSpacing: 2 }}>
      LOADING...
    </div>
  );
}

/**
 * 在详情页顶部调用（在任何 return 之前、与其它 hooks 同级）。
 * 返回非 null 时，调用方应 `return` 该元素（重定向或加载占位）。
 */
export function useDetailGate(module: GatedModule, slug?: string): JSX.Element | null {
  const { isAuthed } = useAuth();
  const loc = useLocation();
  const cfg = MODULE_QUERY[module];
  const { data, isLoading } = useQuery({
    queryKey: cfg.key,
    queryFn: cfg.fn,
    enabled: !isAuthed, // 已登录无需判定
  });

  if (isAuthed) return null;
  if (isLoading || !data) return <GateLoading />; // 列表就绪前不闪出受限内容
  const allowed = data.slice(0, ANON_LIMIT).map((x) => x.slug);
  if (slug && !allowed.includes(slug)) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  return null;
}
