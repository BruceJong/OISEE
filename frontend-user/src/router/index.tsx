import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { RequireAuth } from '@/components/RequireAuth';
import { HomePage } from '@/pages/HomePage';
import { ScenesMapPage } from '@/pages/ScenesMapPage';
import { SceneDetailPage } from '@/pages/SceneDetailPage';
import { ItemDetailPage } from '@/pages/ItemDetailPage';
import { ItemsListPage } from '@/pages/ItemsListPage';
import { KnowledgeListPage } from '@/pages/KnowledgeListPage';
import { KnowledgeDetailPage } from '@/pages/KnowledgeDetailPage';
import { ExperimentsPage } from '@/pages/ExperimentsPage';
import { ExperimentDetailPage } from '@/pages/ExperimentDetailPage';
import { BackpackPage } from '@/pages/BackpackPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';

export const router = createBrowserRouter([
  // 鉴权页（全屏、AppShell 外）
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/scenes', element: <ScenesMapPage /> },
      { path: '/scenes/:slug', element: <SceneDetailPage /> },
      { path: '/items', element: <ItemsListPage /> },
      { path: '/items/:slug', element: <ItemDetailPage /> },
      { path: '/knowledge', element: <KnowledgeListPage /> },
      { path: '/knowledge/:slug', element: <KnowledgeDetailPage /> },
      { path: '/experiments', element: <ExperimentsPage /> },
      { path: '/experiments/:slug', element: <ExperimentDetailPage /> },
      { path: '/backpack', element: <RequireAuth><BackpackPage /></RequireAuth> },
    ],
  },
]);
