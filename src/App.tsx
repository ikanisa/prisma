import { lazy } from 'react';
import type { ComponentType } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { FallbackRedirect } from "@/components/fallback-redirect";
import { renderWithRouteSuspense } from '@/components/ui/route-suspense';
import { CookieConsent } from '@/components/privacy/CookieConsent';

// Layout components
import { AppShell } from "./components/layout/app-shell";

// Pages (lazy-loaded)
const lazyNamed = <T extends Record<string, any>>(factory: () => Promise<T>, name: keyof T) =>
  lazy(() =>
    factory().then((module) => ({
      default: module[name] as ComponentType<any>,
    })),
  );

const lazyDefault = <T extends { default: ComponentType<any> }>(factory: () => Promise<T>) => lazy(factory);

const Dashboard = lazyNamed(() => import('./pages/dashboard'), 'Dashboard');
const Clients = lazyNamed(() => import('./pages/clients'), 'Clients');
const Engagements = lazyNamed(() => import('./pages/engagements'), 'Engagements');
const IndependencePage = lazyNamed(() => import('./pages/independence'), 'Independence');
const Tasks = lazyNamed(() => import('./pages/tasks'), 'Tasks');
const Documents = lazyNamed(() => import('./pages/documents'), 'Documents');
const Notifications = lazyNamed(() => import('./pages/notifications'), 'Notifications');
const Activity = lazyNamed(() => import('./pages/activity'), 'Activity');
const Settings = lazyNamed(() => import('./pages/settings'), 'Settings');
const SignIn = lazyNamed(() => import('./pages/auth/sign-in'), 'SignIn');
const NotFound = lazyDefault(() => import('./pages/NotFound'));
const Unauthorized = lazyDefault(() => import('./pages/Unauthorized'));
const KamReportingPage = lazyDefault(() => import('./pages/reporting/kam'));
const ReportBuilderPage = lazyDefault(() => import('./pages/reporting/report'));
const TcwgPage = lazyDefault(() => import('./pages/reporting/tcwg'));
const PbcManagerPage = lazyDefault(() => import('./pages/reporting/pbc'));
const TelemetryDashboardPage = lazyDefault(() => import('./pages/telemetry/dashboard'));
const ConsolidationPage = lazyDefault(() => import('./pages/reporting/consolidation'));
const ControlsMatrixPage = lazyDefault(() => import('./pages/reporting/controls'));
const AcceptancePage = lazyDefault(() => import('./pages/acceptance'));
const AgentLearningPage = lazyDefault(() => import('./pages/agents/learning'));
const AgentConfigurationPage = lazyDefault(() => import('./pages/agents/configuration'));
const KnowledgeRepositoriesPage = lazyDefault(() => import('./pages/knowledge/repositories'));
const KnowledgeRunsPage = lazyDefault(() => import('./pages/knowledge/runs'));
const AuditPlanPage = lazyDefault(() => import('./pages/audit/plan'));
const AuditRiskRegisterPage = lazyDefault(() => import('./pages/audit/risk-register'));
const AuditResponsesPage = lazyDefault(() => import('./pages/audit/responses'));
const FraudPlanPage = lazyDefault(() => import('./pages/audit/fraud-plan'));
const MaltaCitPage = lazyDefault(() => import('./pages/tax/malta-cit'));
const VatOssPage = lazyDefault(() => import('./pages/tax/vat-oss'));
const Dac6Page = lazyDefault(() => import('./pages/tax/dac6'));
const PillarTwoPage = lazyDefault(() => import('./pages/tax/pillar-two'));
const TreatyWhtPage = lazyDefault(() => import('./pages/tax/treaty-wht'));
const AuditWorkspaceRedirect = lazyDefault(() => import('./pages/audit/workspace'));
const AuditControlsWorkspace = lazyDefault(() => import('./pages/audit/workspace/controls'));
const AuditAnalyticsWorkspace = lazyDefault(() => import('./pages/audit/workspace/analytics'));
const AuditReconciliationsWorkspace = lazyDefault(() => import('./pages/audit/workspace/reconciliations'));
const AuditGroupWorkspace = lazyDefault(() => import('./pages/audit/workspace/group'));
const AuditServiceOrgsWorkspace = lazyDefault(() => import('./pages/audit/workspace/service-orgs'));
const AuditSpecialistsWorkspace = lazyDefault(() => import('./pages/audit/workspace/specialists'));
const AuditOtherInformationWorkspace = lazyDefault(() => import('./pages/audit/workspace/other-information'));
const AccountingCloseWorkspace = lazyDefault(() => import('./pages/accounting'));
const OnboardingPage = lazyDefault(() => import('./pages/onboarding'));
const AutopilotPage = lazyDefault(() => import('./pages/autopilot'));
const PrivacyPage = lazyDefault(() => import('./pages/privacy'));
const AnalyticsOverviewPage = lazyDefault(() => import('./pages/analytics/overview'));
const AdminConsolePage = lazyDefault(() => import('./pages/admin'));
const AdminUsersPage = lazyDefault(() => import('./pages/admin/users'));
const AdminTeamsPage = lazyDefault(() => import('./pages/admin/teams'));

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
        <CookieConsent />
        <PWAInstallPrompt />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Public routes */}
            <Route path="/auth/sign-in" element={renderWithRouteSuspense(<SignIn />)} />
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
              <Route path="dashboard" element={renderWithRouteSuspense(<Dashboard />)} />
              <Route path="clients" element={renderWithRouteSuspense(<Clients />)} />
              <Route path="engagements" element={renderWithRouteSuspense(<Engagements />)} />
              <Route path="independence" element={renderWithRouteSuspense(<IndependencePage />)} />
              <Route
                path="engagements/:engagementId/reporting/kam"
                element={renderWithRouteSuspense(<KamReportingPage />)}
              />
              <Route
                path="engagements/:engagementId/reporting/report"
                element={renderWithRouteSuspense(<ReportBuilderPage />)}
              />
              <Route
                path="engagements/:engagementId/reporting/tcwg"
                element={renderWithRouteSuspense(<TcwgPage />)}
              />
              <Route
                path="engagements/:engagementId/reporting/pbc"
                element={renderWithRouteSuspense(<PbcManagerPage />)}
              />
              <Route
                path="engagements/:engagementId/reporting/consolidation"
                element={renderWithRouteSuspense(<ConsolidationPage />)}
              />
              <Route path="telemetry" element={renderWithRouteSuspense(<TelemetryDashboardPage />)} />
              <Route
                path="engagements/:engagementId/reporting/controls"
                element={renderWithRouteSuspense(<ControlsMatrixPage />)}
              />
              <Route
                path="engagements/:engagementId/acceptance"
                element={renderWithRouteSuspense(<AcceptancePage />)}
              />
              <Route
                path="engagements/:engagementId/planning/audit-plan"
                element={renderWithRouteSuspense(<AuditPlanPage />)}
              />
              <Route
                path="engagements/:engagementId/planning/risk-register"
                element={renderWithRouteSuspense(<AuditRiskRegisterPage />)}
              />
              <Route
                path="engagements/:engagementId/planning/responses"
                element={renderWithRouteSuspense(<AuditResponsesPage />)}
              />
              <Route
                path="engagements/:engagementId/planning/fraud-plan"
                element={renderWithRouteSuspense(<FraudPlanPage />)}
              />
              <Route
                path="audit"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    {renderWithRouteSuspense(<AuditWorkspaceRedirect />)}
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit/controls"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    {renderWithRouteSuspense(<AuditControlsWorkspace />)}
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit/analytics"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    {renderWithRouteSuspense(<AuditAnalyticsWorkspace />)}
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit/reconciliations"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    {renderWithRouteSuspense(<AuditReconciliationsWorkspace />)}
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit/group"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    {renderWithRouteSuspense(<AuditGroupWorkspace />)}
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit/service-orgs"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    {renderWithRouteSuspense(<AuditServiceOrgsWorkspace />)}
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit/specialists"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    {renderWithRouteSuspense(<AuditSpecialistsWorkspace />)}
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit/other-information"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    {renderWithRouteSuspense(<AuditOtherInformationWorkspace />)}
                  </ProtectedRoute>
                }
              />
              <Route
                path="accounting"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    {renderWithRouteSuspense(<AccountingCloseWorkspace />)}
                  </ProtectedRoute>
                }
              />
              <Route
                path="onboarding"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    {renderWithRouteSuspense(<OnboardingPage />)}
                  </ProtectedRoute>
                }
              />
              <Route
                path="autopilot"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    {renderWithRouteSuspense(<AutopilotPage />)}
                  </ProtectedRoute>
                }
              />
              <Route
                path="analytics"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    {renderWithRouteSuspense(<AnalyticsOverviewPage />)}
                  </ProtectedRoute>
                }
              />
              <Route path="tax/malta-cit" element={<MaltaCitPage />} />
              <Route path="tax/vat-oss" element={<VatOssPage />} />
              <Route path="tax/dac6" element={<Dac6Page />} />
              <Route path="tax/pillar-two" element={<PillarTwoPage />} />
              <Route path="tax/treaty-wht" element={<TreatyWhtPage />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="documents" element={<Documents />} />
              <Route
                path="admin"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    {renderWithRouteSuspense(<AdminConsolePage />)}
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    {renderWithRouteSuspense(<AdminUsersPage />)}
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/teams"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    {renderWithRouteSuspense(<AdminTeamsPage />)}
                  </ProtectedRoute>
                }
              />

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
              <Route
                path="agents/configuration"
                element={
                  <ProtectedRoute requiredRole="MANAGER">
                    <AgentConfigurationPage />
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
            <Route path="/privacy" element={renderWithRouteSuspense(<PrivacyPage />)} />

            {/* Catch all - 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
