import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Login } from '@/pages/Login'
import { Signup } from '@/pages/Signup'
import { Dashboard } from '@/pages/Dashboard'

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
        element: <Placeholder title="Schemas" />,
      },
      {
        path: '/schemas/new',
        element: <Placeholder title="New Schema" />,
      },
      {
        path: '/schemas/:id',
        element: <Placeholder title="Schema Detail" />,
      },
      {
        path: '/webhooks',
        element: <Placeholder title="Webhooks" />,
      },
      {
        path: '/webhooks/new',
        element: <Placeholder title="New Webhook" />,
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
