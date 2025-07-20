import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "@/hooks/admin/useAdminAuth";
import { 
  LayoutDashboard, 
  Users, 
  Store, 
  Truck, 
  Package, 
  ShoppingCart, 
  CreditCard, 
  Calendar, 
  HelpCircle, 
  Activity,
  Menu,
  X,
  Settings,
  Bot,
  Brain,
  Cog,
  BookOpen,
  FileText,
  ScrollText,
  MessageSquare,
  Tractor,
  Hammer,
  Layers,
  ClipboardList,
  Rocket,
  Home,
  Car,
  BarChart3,
  Users2,
  AlertTriangle,
  TestTube,
  LucideIcon
} from "lucide-react";

interface SidebarItem {
  name: string;
  path: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  category?: 'core' | 'business' | 'ai' | 'monitoring' | 'tools';
}

interface SidebarCategory {
  name: string;
  items: SidebarItem[];
}

const sidebarData: SidebarCategory[] = [
  {
    name: "Core",
    items: [
      { name: "Dashboard", path: "/admin", icon: LayoutDashboard, category: 'core' },
      { name: "Users", path: "/admin/users", icon: Users, category: 'core' },
      { name: "System Metrics", path: "/admin/system-metrics", icon: Activity, category: 'core' },
    ]
  },
  {
    name: "Business",
    items: [
      { name: "Businesses", path: "/admin/businesses", icon: Store, category: 'business' },
      { name: "Drivers", path: "/admin/drivers", icon: Truck, category: 'business' },
      { name: "Farmers", path: "/admin/farmers", icon: Tractor, category: 'business' },
      { name: "Properties", path: "/admin/properties", icon: Home, category: 'business' },
      { name: "Vehicles", path: "/admin/vehicles", icon: Car, category: 'business' },
    ]
  },
  {
    name: "Operations",
    items: [
      { name: "Unified Orders", path: "/admin/unified-orders", icon: ShoppingCart, category: 'business' },
      { name: "Unified Products", path: "/admin/unified-products", icon: Package, category: 'business' },
      { name: "Payments", path: "/admin/payments", icon: CreditCard, category: 'business' },
      { name: "Events", path: "/admin/events", icon: Calendar, category: 'business' },
    ]
  },
  {
    name: "AI & Communication",
    items: [
      { name: "AI Agents", path: "/admin/agents", icon: Bot, category: 'ai' },
      { name: "Personas", path: "/admin/personas", icon: Brain, category: 'ai' },
      { name: "WhatsApp Dashboard", path: "/admin/whatsapp", icon: MessageSquare, category: 'ai' },
      { name: "Unified Conversations", path: "/admin/unified-conversations", icon: MessageSquare, category: 'ai' },
      { name: "Marketing Campaigns", path: "/admin/marketing-campaigns", icon: MessageSquare, category: 'ai' },
      { name: "AI Management", path: "/admin/ai-management", icon: Brain, category: 'ai' },
    ]
  },
  {
    name: "Monitoring",
    items: [
      { name: "Quality Dashboard", path: "/admin/quality-dashboard", icon: BarChart3, category: 'monitoring' },
      { name: "Live Handoffs", path: "/admin/live-handoffs", icon: Users2, category: 'monitoring' },
      { name: "Agent Logs", path: "/admin/agent-logs", icon: ScrollText, category: 'monitoring' },
      { name: "Edge Logs", path: "/admin/edge-logs", icon: Activity, category: 'monitoring' },
      { name: "Experiments & Flags", path: "/admin/experiments-new", icon: TestTube, category: 'monitoring' },
    ]
  },
  {
    name: "Tools",
    items: [
      { name: "Documents", path: "/admin/documents", icon: FileText, category: 'tools' },
      { name: "Learning", path: "/admin/learning", icon: BookOpen, category: 'tools' },
      { name: "Tasks/Tools", path: "/admin/tasks", icon: Cog, category: 'tools' },
      { name: "Hardware Deployment", path: "/admin/hardware-deployment", icon: Rocket, category: 'tools' },
      { name: "Settings", path: "/admin/settings", icon: Settings, category: 'tools' },
    ]
  }
];

interface SidebarState {
  isOpen: boolean;
  collapsedCategories: Set<string>;
}

export function AdminLayoutEnhanced() {
  const [sidebarState, setSidebarState] = React.useState<SidebarState>({
    isOpen: true,
    collapsedCategories: new Set()
  });
  
  const location = useLocation();
  const { user, isAdmin, loading } = useAdminAuth();

  const toggleSidebar = () => {
    setSidebarState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  };

  const toggleCategory = (categoryName: string) => {
    setSidebarState(prev => {
      const newCollapsedCategories = new Set(prev.collapsedCategories);
      if (newCollapsedCategories.has(categoryName)) {
        newCollapsedCategories.delete(categoryName);
      } else {
        newCollapsedCategories.add(categoryName);
      }
      return { ...prev, collapsedCategories: newCollapsedCategories };
    });
  };

  const isActiveRoute = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const getSystemStatus = (): 'online' | 'degraded' | 'offline' => {
    // In a real app, this would check actual system health
    return 'online';
  };

  const statusColors = {
    online: 'bg-green-500',
    degraded: 'bg-yellow-500',
    offline: 'bg-red-500'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <span>Loading admin panel...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to access this panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Top Bar */}
      <header className="border-b bg-card shadow-sm sticky top-0 z-50">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="text-muted-foreground hover:text-foreground"
            >
              {sidebarState.isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">easyMO Admin</h1>
              <Badge variant="outline" className="text-xs">
                v2.0
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className={cn("h-2 w-2 rounded-full", statusColors[getSystemStatus()])}></div>
              <span>System {getSystemStatus()}</span>
            </div>
            
            {user && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Admin:</span>
                <span className="font-medium">{user.email || user.phone}</span>
              </div>
            )}
            
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Enhanced Sidebar */}
        <aside className={cn(
          "border-r bg-card transition-all duration-300 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto",
          sidebarState.isOpen ? "w-64" : "w-16"
        )}>
          <nav className="p-4 space-y-6">
            {sidebarData.map((category) => (
              <div key={category.name}>
                {sidebarState.isOpen && (
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {category.name}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => toggleCategory(category.name)}
                    >
                      <span className="text-xs">
                        {sidebarState.collapsedCategories.has(category.name) ? '+' : '−'}
                      </span>
                    </Button>
                  </div>
                )}
                
                {(!sidebarState.collapsedCategories.has(category.name) || !sidebarState.isOpen) && (
                  <div className="space-y-1">
                    {category.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = isActiveRoute(item.path);
                      
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                            "hover:bg-muted/80 focus:bg-muted/80 focus:outline-none",
                            isActive 
                              ? "bg-primary text-primary-foreground shadow-sm" 
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          
                          {sidebarState.isOpen && (
                            <>
                              <span className="flex-1 truncate">{item.name}</span>
                              {item.badge && (
                                <Badge variant={item.badge.variant} className="text-xs ml-auto">
                                  {item.badge.text}
                                </Badge>
                              )}
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
                
                {sidebarState.isOpen && category.name !== sidebarData[sidebarData.length - 1].name && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Enhanced Main Content */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] bg-background/50">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}