import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
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
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { name: "Users", path: "/admin/users", icon: Users },
  { name: "Businesses", path: "/admin/businesses", icon: Store },
  { name: "Drivers", path: "/admin/drivers", icon: Truck },
  { name: "Farmers", path: "/admin/farmers", icon: Tractor },
  { name: "Properties", path: "/admin/properties", icon: Home },
  { name: "Vehicles", path: "/admin/vehicles", icon: Car },
  { name: "Live Handoffs", path: "/admin/live-handoffs", icon: Users2 },
  { name: "Quality Dashboard", path: "/admin/quality-dashboard", icon: BarChart3 },
  { name: "System Metrics", path: "/admin/system-metrics", icon: Activity },
  { name: "Experiments", path: "/admin/experiments", icon: AlertTriangle },
  { name: "Trips & Intents", path: "/admin/trips", icon: Car },
  { name: "Hardware Vendors", path: "/admin/hardware", icon: Hammer },
  { name: "Product Imports", path: "/admin/product-drafts", icon: Layers },
  { name: "Produce Drafts", path: "/admin/produce-drafts", icon: ClipboardList },
  { name: "Produce Listings", path: "/admin/produce-listings", icon: Package },
  { name: "Unified Products", path: "/admin/unified-products", icon: Package },
  { name: "Products", path: "/admin/products", icon: Package },
  { name: "Hardware Deployment", path: "/admin/hardware-deployment", icon: Rocket },
  { name: "Unified Orders", path: "/admin/unified-orders", icon: ShoppingCart },
  { name: "Orders", path: "/admin/orders", icon: ShoppingCart },
  { name: "Payments", path: "/admin/payments", icon: CreditCard },
  { name: "Events", path: "/admin/events", icon: Calendar },
  { name: "AI Agents", path: "/admin/agents", icon: Bot },
  { name: "Personas", path: "/admin/personas", icon: Brain },
  { name: "Model Registry", path: "/admin/model-registry", icon: Settings },
  { name: "Tasks/Tools", path: "/admin/tasks", icon: Cog },
  { name: "Learning", path: "/admin/learning", icon: BookOpen },
  { name: "Documents", path: "/admin/documents", icon: FileText },
  { name: "Agent Logs", path: "/admin/agent-logs", icon: ScrollText },
  { name: "WhatsApp Dashboard", path: "/admin/whatsapp", icon: MessageSquare },
  { name: "WhatsApp Contacts", path: "/admin/whatsapp-contacts", icon: Users },
  { name: "Unified Conversations", path: "/admin/unified-conversations", icon: MessageSquare },
  { name: "Conversations", path: "/admin/conversations", icon: MessageSquare },
  { name: "Marketing Campaigns", path: "/admin/marketing-campaigns", icon: MessageSquare },
  { name: "Help", path: "/admin/help", icon: HelpCircle },
  { name: "Settings", path: "/admin/settings", icon: Settings },
  { name: "Edge Logs", path: "/admin/edge-logs", icon: Activity },
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