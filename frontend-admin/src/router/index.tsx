import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { SceneManagePage } from '@/pages/scenes-manage/SceneManagePage';
import { ItemManagePage } from '@/pages/items-manage/ItemManagePage';
import { KnowledgeManagePage } from '@/pages/knowledge-manage/KnowledgeManagePage';
import { ExperimentManagePage } from '@/pages/experiments-manage/ExperimentManagePage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
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
            { path: 'scenes',    element: <SceneManagePage /> },
            { path: 'items',     element: <ItemManagePage /> },
            { path: 'knowledge', element: <KnowledgeManagePage /> },
            { path: 'experiments', element: <ExperimentManagePage /> },
            { path: 'settings',  element: <SettingsPage /> },
            // 兼容旧链接
            { path: 'quick',   element: <Navigate to="/scenes" replace /> },
            { path: 'content', element: <Navigate to="/items" replace /> },
          ],
        },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  { basename: '/cms/' }
);
