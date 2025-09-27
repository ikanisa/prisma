import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { FallbackRedirect } from "@/components/fallback-redirect";

// Layout components
import { AppShell } from "./components/layout/app-shell";

// Pages
import { Dashboard } from "./pages/dashboard";
import { Clients } from "./pages/clients";
import { Engagements } from "./pages/engagements";  
import { Tasks } from "./pages/tasks";
import { Documents } from "./pages/documents";
import { Notifications } from "./pages/notifications";
import { Activity } from "./pages/activity";
import { Settings } from "./pages/settings";
import KamReportingPage from "./pages/reporting/kam";
import ReportBuilderPage from "./pages/reporting/report";
import TcwgPage from "./pages/reporting/tcwg";
import PbcManagerPage from "./pages/reporting/pbc";
import TelemetryDashboardPage from "./pages/telemetry/dashboard";
import ConsolidationPage from "./pages/reporting/consolidation";
import ControlsMatrixPage from "./pages/reporting/controls";
import AcceptancePage from "./pages/acceptance";
import { SignIn } from "./pages/auth/sign-in";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import AgentLearningPage from "./pages/agents/learning";
import KnowledgeRepositoriesPage from "./pages/knowledge/repositories";
import KnowledgeRunsPage from "./pages/knowledge/runs";
import AuditPlanPage from "./pages/audit/plan";
import AuditRiskRegisterPage from "./pages/audit/risk-register";
import AuditResponsesPage from "./pages/audit/responses";
import FraudPlanPage from "./pages/audit/fraud-plan";
import MaltaCitPage from "./pages/tax/malta-cit";
import VatOssPage from "./pages/tax/vat-oss";
import Dac6Page from "./pages/tax/dac6";
import PillarTwoPage from "./pages/tax/pillar-two";
import TreatyWhtPage from "./pages/tax/treaty-wht";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAInstallPrompt />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/auth/sign-in" element={<SignIn />} />
            <Route path="/" element={<FallbackRedirect />} />
            
            {/* Protected org routes */}
            <Route 
              path="/:orgSlug" 
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="engagements" element={<Engagements />} />
              <Route path="engagements/:engagementId/reporting/kam" element={<KamReportingPage />} />
              <Route path="engagements/:engagementId/reporting/report" element={<ReportBuilderPage />} />
              <Route path="engagements/:engagementId/reporting/tcwg" element={<TcwgPage />} />
              <Route path="engagements/:engagementId/reporting/pbc" element={<PbcManagerPage />} />
              <Route path="engagements/:engagementId/reporting/consolidation" element={<ConsolidationPage />} />
              <Route path="telemetry" element={<TelemetryDashboardPage />} />
              <Route path="engagements/:engagementId/reporting/controls" element={<ControlsMatrixPage />} />
              <Route path="engagements/:engagementId/acceptance" element={<AcceptancePage />} />
              <Route path="engagements/:engagementId/planning/audit-plan" element={<AuditPlanPage />} />
              <Route
                path="engagements/:engagementId/planning/risk-register"
                element={<AuditRiskRegisterPage />}
              />
              <Route
                path="engagements/:engagementId/planning/responses"
                element={<AuditResponsesPage />}
              />
              <Route
                path="engagements/:engagementId/planning/fraud-plan"
                element={<FraudPlanPage />}
              />
              <Route path="tax/malta-cit" element={<MaltaCitPage />} />
              <Route path="tax/vat-oss" element={<VatOssPage />} />
              <Route path="tax/dac6" element={<Dac6Page />} />
              <Route path="tax/pillar-two" element={<PillarTwoPage />} />
              <Route path="tax/treaty-wht" element={<TreatyWhtPage />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="documents" element={<Documents />} />
              <Route
                path="knowledge/repositories"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    <KnowledgeRepositoriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="knowledge/runs"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    <KnowledgeRunsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="agents/learning"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    <AgentLearningPage />
                  </ProtectedRoute>
                }
              />
              <Route path="notifications" element={<Notifications />} />
              <Route path="activity" element={<Activity />} />
              <Route path="settings" element={
                <ProtectedRoute requiredRole="MANAGER">
                  <Settings />
                </ProtectedRoute>
              } />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* System Admin Routes */}
            <Route 
              path="/admin/system" 
              element={
                <ProtectedRoute requiredRole="SYSTEM_ADMIN">
                  <div className="p-8">
                    <h1 className="text-3xl font-bold">System Administration</h1>
                    <p className="text-muted-foreground mt-2">Manage organizations and system-wide settings</p>
                  </div>
                </ProtectedRoute>
              } 
            />

            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Catch all - 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
