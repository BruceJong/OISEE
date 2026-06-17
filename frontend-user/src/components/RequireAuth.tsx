import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/utils/auth';

/** 需登录才能访问的路由包装：匿名 → 重定向登录页，并记录来源以便登录后回跳 */
export function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthed } = useAuth();
  const loc = useLocation();
  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  return children;
}
