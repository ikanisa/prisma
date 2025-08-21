import { useState } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { CommandPalette } from "@/components/command-palette";
import { useAppStore } from "@/stores/mock-data";
import { Navigate, Outlet } from "react-router-dom";

export function AppShell() {
  const { currentUser, currentOrg } = useAppStore();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Redirect to login if not authenticated
  if (!currentUser || !currentOrg) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <div className={sidebarCollapsed ? "w-16" : "w-64"} style={{ transition: "width 0.2s ease" }}>
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      </div>
      <div className="flex-1 flex flex-col">
        <Header onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
      
      <CommandPalette 
        open={commandPaletteOpen} 
        onOpenChange={setCommandPaletteOpen} 
      />
    </div>
  );
}