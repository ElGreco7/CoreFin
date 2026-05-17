import { PathDetail } from './pages/PathDetail';
import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { NewTransaction } from './pages/NewTransaction';
import { Reports } from './pages/Reports';
import { Goals } from './pages/Goals';
import { NewGoal } from './pages/NewGoal';
import { Education } from './pages/Education';
import { ContentDetail } from './pages/ContentDetail';
import { Chat } from './pages/Chat';
import { Admin } from './pages/Admin';
import { ManageUsers } from './pages/ManageUsers';
import { ManageContent } from './pages/ManageContent';
import { AdminAnalytics } from './pages/AdminAnalytics';
import { AdminSettings } from './pages/AdminSettings';
import { Settings } from './pages/Settings';
import { Notifications } from './pages/Notifications';

function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // ── Rotas públicas ─────────────────────────────────────
      { index: true, element: <Navigate to="/login" replace /> },
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },

      // ── Rotas privadas (exigem login) ─────────────────────
      {
        element: (
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: 'home', element: <Home /> },
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'transactions', element: <Transactions /> },
          { path: 'transactions/new', element: <NewTransaction /> },
          { path: 'reports', element: <Reports /> },
          { path: 'goals', element: <Goals /> },
          { path: 'goals/new', element: <NewGoal /> },
          { path: 'education', element: <Education /> },
          { path: 'education/path/:id', element: <PathDetail /> },
          { path: 'education/content/:id', element: <ContentDetail /> },
          { path: 'chat', element: <Chat /> },
          { path: 'settings', element: <Settings /> },
          { path: 'notifications', element: <Notifications /> },

          {
            path: 'admin',
            element: (
              <ProtectedRoute requireRole={['admin', 'viewer']}>
                <Admin />
              </ProtectedRoute>
            ),
          },
          {
            path: 'admin/users',
            element: (
              <ProtectedRoute requireRole={['admin', 'viewer']}>
                <ManageUsers />
              </ProtectedRoute>
            ),
          },
          {
            path: 'admin/content',
            element: (
              <ProtectedRoute requireRole={['admin', 'viewer']}>
                <ManageContent />
              </ProtectedRoute>
            ),
          },
          {
            path: 'admin/analytics',
            element: (
              <ProtectedRoute requireRole={['admin', 'viewer']}>
                <AdminAnalytics />
              </ProtectedRoute>
            ),
          },
          {
            path: 'admin/settings',
            element: (
              <ProtectedRoute requireRole={['admin', 'viewer']}>
                <AdminSettings />
              </ProtectedRoute>
            ),
          },
        ],
      },
    ],
  },
]);