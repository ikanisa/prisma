import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";

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
            <Route path="/" element={<Navigate to="/aurora/dashboard" replace />} />
            <Route path="/auth/sign-in" element={<SignIn />} />
            
            {/* Protected org routes */}
            <Route path="/:orgSlug" element={<AppShell />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="engagements" element={<Engagements />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="documents" element={<Documents />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="activity" element={<Activity />} />
              <Route path="settings" element={<Settings />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Catch all - 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
