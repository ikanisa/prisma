import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageLoader } from '@/components/ui/loading';
import { ErrorBoundary } from '@/components/error-boundary';
import { AuthProvider } from '@/contexts/auth-context';

// Eager load critical components
import { AuthGuard } from '@/components/auth/AuthGuard';
import { MainLayout } from '@/components/layout/MainLayout';

// Lazy load route components for code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const Documents = lazy(() => import('@/pages/documents/DocumentList'));
const DocumentDetail = lazy(() => import('@/pages/documents/DocumentDetail'));
const Tasks = lazy(() => import('@/pages/tasks/TaskBoard'));
const TaskDetail = lazy(() => import('@/pages/tasks/TaskDetail'));
const Analytics = lazy(() => import('@/pages/analytics/Analytics'));
const Reporting = lazy(() => import('@/pages/reporting/ReportingDashboard'));
const Settings = lazy(() => import('@/pages/settings/Settings'));
const AIAgent = lazy(() => import('@/pages/ai/AIAgent'));
const KnowledgeBase = lazy(() => import('@/pages/knowledge/KnowledgeBase'));
const Audit = lazy(() => import('@/pages/audit/AuditEngagement'));
const Tax = lazy(() => import('@/pages/tax/TaxDashboard'));

// Create query client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * App Component with Code Splitting
 * - Lazy loads route components
 * - Suspense boundaries for loading states
 * - Error boundaries for graceful degradation
 */
export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route
                path="/login"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Login />
                  </Suspense>
                }
              />
              <Route
                path="/register"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Register />
                  </Suspense>
                }
              />

              {/* Protected routes with layout */}
              <Route
                path="/"
                element={
                  <AuthGuard>
                    <MainLayout />
                  </AuthGuard>
                }
              >
                <Route
                  index
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <Dashboard />
                    </Suspense>
                  }
                />
                <Route
                  path="dashboard"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <Dashboard />
                    </Suspense>
                  }
                />
                <Route
                  path="documents"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <Documents />
                    </Suspense>
                  }
                />
                <Route
                  path="documents/:id"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <DocumentDetail />
                    </Suspense>
                  }
                />
                <Route
                  path="tasks"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <Tasks />
                    </Suspense>
                  }
                />
                <Route
                  path="tasks/:id"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <TaskDetail />
                    </Suspense>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <Analytics />
                    </Suspense>
                  }
                />
                <Route
                  path="reporting/*"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <Reporting />
                    </Suspense>
                  }
                />
                <Route
                  path="ai"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AIAgent />
                    </Suspense>
                  }
                />
                <Route
                  path="knowledge"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <KnowledgeBase />
                    </Suspense>
                  }
                />
                <Route
                  path="audit/*"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <Audit />
                    </Suspense>
                  }
                />
                <Route
                  path="tax/*"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <Tax />
                    </Suspense>
                  }
                />
                <Route
                  path="settings/*"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <Settings />
                    </Suspense>
                  }
                />
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
