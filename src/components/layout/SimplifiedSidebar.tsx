import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, FileText, CheckSquare, Users, Settings,
  ChevronRight, Sparkles, Search, Plus, Menu, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation, Link } from 'react-router-dom';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/' },
  { id: 'documents', label: 'Documents', icon: FileText, href: '/documents' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, href: '/tasks', badge: 3 },
  { id: 'clients', label: 'Clients', icon: Users, href: '/clients' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
];

interface SimplifiedSidebarProps {
  collapsed?: boolean;
}

export function SimplifiedSidebar({ collapsed: initialCollapsed = false }: SimplifiedSidebarProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 256 }}
      className={cn(
        'relative flex flex-col border-r bg-card',
        'transition-all duration-300'
      )}
      id="navigation"
    >
      {/* Logo & Toggle */}
      <div className={cn(
        'flex h-16 items-center border-b px-4',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Prisma</span>
          </div>
        )}
        
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'rounded-lg p-2 transition-colors hover:bg-accent',
            collapsed && 'mx-auto'
          )}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </button>
      </div>

      {/* Quick Actions */}
      {!collapsed && (
        <div className="border-b p-4">
          <button className="flex w-full items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Item
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.id}
                to={item.href}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                  'transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center'
                )}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0')} />
                
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    
                    {item.badge && (
                      <span className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold',
                        isActive
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-primary/10 text-primary'
                      )}>
                        {item.badge}
                      </span>
                    )}
                    
                    {isActive && (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </>
                )}

                {collapsed && item.badge && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* AI Assistant Trigger */}
      <div className={cn('border-t p-3', collapsed && 'flex justify-center')}>
        <button
          className={cn(
            'flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-purple-300',
            'bg-purple-50 px-3 py-2.5 text-sm font-medium text-purple-700',
            'transition-colors hover:border-purple-400 hover:bg-purple-100',
            'dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-400',
            collapsed && 'justify-center px-2'
          )}
        >
          <Sparkles className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>AI Assistant</span>}
        </button>
      </div>
    </motion.aside>
  );
}
