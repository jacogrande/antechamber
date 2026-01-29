import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/components/auth/AuthGuard'
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
import { Webhooks } from '@/pages/webhooks'

// Placeholder pages for routes that will be implemented in later phases
function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1>{title}</h1>
      <p>Coming soon...</p>
    </div>
  )
}

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

  // Protected routes
  {
    element: (
      <AuthGuard>
        <AppShell />
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
        path: '/webhooks',
        element: <Webhooks />,
      },
      {
        path: '/settings',
        element: <Placeholder title="Settings" />,
      },
    ],
  },

  // Catch-all redirect
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
