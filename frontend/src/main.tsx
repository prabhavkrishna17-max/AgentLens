import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from './features/dashboard/Dashboard'
import TracePage from './features/trace/TracePage'
import LandingPage from './features/landing/LandingPage'
import './index.css'

import AppLayout from './components/AppLayout'
import HistoryPage from './features/history/HistoryPage'
import AgentWorkspace from './features/agent/AgentWorkspace'

import SettingsPage from './features/settings/SettingsPage'
import ProjectsPage from './features/projects/ProjectsPage'
import PromptLabPage from './features/prompt-lab/PromptLabPage'
import ComparePage from './features/compare/ComparePage'
import IntegratePage from './features/integrate/IntegratePage'

import PublicLayout from './components/PublicLayout'
import FeaturesPage from './features/features/FeaturesPage'

import OnboardingFlow from './features/onboarding/OnboardingFlow'

const queryClient = new QueryClient()

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      {
        path: '',
        element: <LandingPage />,
      },
      {
        path: 'features',
        element: <FeaturesPage />,
      }
    ]
  },
  {
    path: '/app/onboarding',
    element: <OnboardingFlow />
  },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      {
        path: 'agent',
        element: <AgentWorkspace />,
      },
      {
        path: '',
        element: <Dashboard />,
      },
      {
        path: 'traces',
        element: <HistoryPage />,
      },
      {
        path: 'projects',
        element: <ProjectsPage />,
      },
      {
        path: 'prompt-lab',
        element: <PromptLabPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'compare',
        element: <ComparePage />,
      },
      {
        path: 'trace/:runId',
        element: <TracePage />,
      },
      {
        path: 'integrate',
        element: <IntegratePage />,
      }
    ]
  }
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)

