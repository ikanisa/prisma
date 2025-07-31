import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Building, 
  Package, 
  ShoppingCart, 
  Route, 
  MessageCircle,
  Bot,
  Settings,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { name: "Users & Contacts", path: "/admin/users-contacts", icon: Users },
  { name: "Businesses", path: "/admin/businesses", icon: Building },
  { name: "Listings & Inventory", path: "/admin/listings-inventory", icon: Package },
  { name: "Orders & Payments", path: "/admin/orders-payments", icon: ShoppingCart },
  { name: "Trips & Intents", path: "/admin/trips-intents", icon: Route },
  { name: "Messaging & Campaigns", path: "/admin/messaging-campaigns", icon: MessageCircle },
  { name: "AI Agents & Models", path: "/admin/ai-agents-models", icon: Bot },
  { name: "System Ops", path: "/admin/system-ops", icon: Settings },
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="border-b bg-card shadow-sm">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-xl font-semibold">easyMO Admin</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span>Supabase Connected</span>
            </div>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "border-r bg-card transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16"
        )}>
          <nav className="p-4 space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span>{item.name}</span>}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}