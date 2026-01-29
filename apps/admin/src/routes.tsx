import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { TenantGuard } from '@/components/auth/TenantGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Login } from '@/pages/Login'
import { Signup } from '@/pages/Signup'
import { Dashboard } from '@/pages/Dashboard'
import {
  Schemas,
  SchemaCreate,
  SchemaDetail,
  SchemaVersionCreate,
} from '@/pages/schemas'
import { SubmissionDetail } from '@/pages/submissions'
import { Webhooks } from '@/pages/webhooks'
import { Settings } from '@/pages/Settings'
import { OrganizationSetup } from '@/pages/setup'

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },

  // Organization setup (auth required, but NOT tenant)
  {
    path: '/setup/org',
    element: (
      <AuthGuard>
        <OrganizationSetup />
      </AuthGuard>
    ),
  },

  // Protected routes (require both auth AND tenant)
  {
    element: (
      <AuthGuard>
        <TenantGuard>
          <AppShell />
        </TenantGuard>
      </AuthGuard>
    ),
    children: [
      {
        path: '/',
        element: <Dashboard />,
      },
      {
        path: '/schemas',
        element: <Schemas />,
      },
      {
        path: '/schemas/new',
        element: <SchemaCreate />,
      },
      {
        path: '/schemas/:id',
        element: <SchemaDetail />,
      },
      {
        path: '/schemas/:id/versions/new',
        element: <SchemaVersionCreate />,
      },
      {
        path: '/submissions/:id',
        element: <SubmissionDetail />,
      },
      {
        path: '/webhooks',
        element: <Webhooks />,
      },
      {
        path: '/settings',
        element: <Settings />,
      },
    ],
  },

  // Catch-all redirect
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
