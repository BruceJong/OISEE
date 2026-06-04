import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { SceneListPage } from '@/pages/scenes/SceneListPage';
import { SceneEditPage } from '@/pages/scenes/SceneEditPage';
import { ItemListPage } from '@/pages/items/ItemListPage';
import { ItemEditPage } from '@/pages/items/ItemEditPage';
import { KnowledgeListPage } from '@/pages/knowledge/KnowledgeListPage';
import { KnowledgeEditPage } from '@/pages/knowledge/KnowledgeEditPage';
import { useAuthStore } from '@/stores/auth';

function RequireAuth() {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    {
      path: '/',
      element: <RequireAuth />,
      children: [
        {
          element: <AppLayout />,
          children: [
            { index: true, element: <DashboardPage /> },
            { path: 'scenes', element: <SceneListPage /> },
            { path: 'scenes/new', element: <SceneEditPage /> },
            { path: 'scenes/:id', element: <SceneEditPage /> },
            { path: 'items', element: <ItemListPage /> },
            { path: 'items/new', element: <ItemEditPage /> },
            { path: 'items/:id', element: <ItemEditPage /> },
            { path: 'knowledge', element: <KnowledgeListPage /> },
            { path: 'knowledge/new', element: <KnowledgeEditPage /> },
            { path: 'knowledge/:id', element: <KnowledgeEditPage /> },
          ],
        },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  { basename: '/cms' }
);
