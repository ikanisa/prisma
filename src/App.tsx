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
import { SignIn } from "./pages/auth/sign-in";
import NotFound from "./pages/NotFound";

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
              <Route path="tasks" element={<Tasks />} />
              <Route path="documents" element={<Documents />} />
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

            {/* Catch all - 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
