import { useState } from 'react';
import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/admin/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Package, 
  ShoppingCart, 
  Route, 
  MessageSquare, 
  Brain, 
  Settings,
  MousePointer,
  Menu,
  X,
  Bell
} from 'lucide-react';

interface SidebarItem {
  name: string;
  path: string;
  icon: any;
  badge?: { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' };
}

const consolidatedSidebarItems: SidebarItem[] = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { name: 'Users & Contacts', path: '/admin/users-contacts', icon: Users },
  { name: 'Businesses', path: '/admin/businesses', icon: Building2 },
  { name: 'Listings & Inventory', path: '/admin/unified-listings', icon: Package },
  { name: 'Orders & Payments', path: '/admin/unified-orders', icon: ShoppingCart },
  { name: 'Trips & Intents', path: '/admin/trips-intents', icon: Route },
  { name: 'Messaging & Campaigns', path: '/admin/messaging-campaigns', icon: MessageSquare },
  { name: 'Template Management', path: '/admin/templates', icon: MessageSquare, badge: { text: 'New', variant: 'default' } },
  { name: 'Action Buttons', path: '/admin/action-buttons', icon: MousePointer },
  { name: 'Omni Agent', path: '/admin/omni-agent', icon: Brain },
  { name: 'System Ops', path: '/admin/system-ops', icon: Settings },
];

export function AdminLayoutConsolidated() {
  const { user, isAdmin, loading } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to auth page if not authenticated
    navigate('/auth');
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to access this area.</p>
          <Button 
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/auth');
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  const isActiveRoute = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 border-r bg-card`}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            {sidebarOpen && (
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold">easyMO Admin</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1">
            <nav className="space-y-1 p-2">
              {consolidatedSidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.path);
                
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/admin'}
                    className={`
                      flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent
                      ${isActive ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground'}
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {sidebarOpen && (
                      <>
                        <span>{item.name}</span>
                        {item.badge && (
                          <Badge variant={item.badge.variant} className="ml-auto">
                            {item.badge.text}
                          </Badge>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          {sidebarOpen && (
            <div className="border-t p-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm">
                  {user.email?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">Online</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="border-b bg-card px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-semibold">Admin Panel</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Badge variant="outline">v1.0</Badge>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}