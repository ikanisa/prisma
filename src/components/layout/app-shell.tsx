import { useState, useEffect } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { CommandPalette } from "@/components/command-palette";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizations } from "@/hooks/use-organizations";
import { AssistantDock } from "@/components/assistant";
import { NpsPrompt } from "@/components/nps/nps-prompt";
import { useShellThemeTokens } from "@/lib/system-config";
import { cn } from "@/lib/utils";
import { AutonomyHud } from "@/components/autonomy/autonomy-hud";

export function AppShell() {
  const { user, loading: authLoading } = useAuth();
  const { currentOrg, loading: orgLoading, switchOrganization, memberships } = useOrganizations();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { orgSlug } = useParams();
  const shellTheme = useShellThemeTokens();
  const targetMembership = orgSlug
    ? memberships.find((membership) => membership.organization.slug === orgSlug)
    : undefined;

  // Auto-switch to the organization based on URL slug
  useEffect(() => {
    if (orgSlug && targetMembership && currentOrg?.slug !== orgSlug) {
      switchOrganization(targetMembership.org_id);
    }
  }, [orgSlug, targetMembership, currentOrg, switchOrganization]);

  // Show loading while checking authentication and organizations
  if (authLoading || orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  // Redirect to 404 if organization doesn't exist or user doesn't have access
  if (
    orgSlug &&
    !orgLoading &&
    memberships.length > 0 &&
    !targetMembership
  ) {
    return <Navigate to="/404" replace />;
  }

  return (
    <div
      className={cn('min-h-screen flex w-full', shellTheme.backgroundClass)}
      data-shell-theme={shellTheme.id}
      data-shell-motion={shellTheme.motion}
    >
      <div className={sidebarCollapsed ? "w-16" : "w-64"} style={{ transition: "width 0.2s ease" }}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>
      <div className="flex-1 flex flex-col">
        <Header
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        />
        <main className="flex-1 p-6 overflow-auto">
          <AutonomyHud />
          <Outlet />
        </main>
      </div>
      
      <CommandPalette 
        open={commandPaletteOpen} 
        onOpenChange={setCommandPaletteOpen} 
      />
      <AssistantDock />
      <NpsPrompt />
    </div>
  );
}
