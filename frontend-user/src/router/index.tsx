import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
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

export const router = createBrowserRouter([
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
      { path: '/backpack', element: <BackpackPage /> },
    ],
  },
]);
