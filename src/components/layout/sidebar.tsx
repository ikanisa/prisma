import { NavLink, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare,
  FileText,
  Bell,
  Activity,
  Settings,
  Menu,
  Sparkles,
  BookOpen,
  Bot,
  ShieldCheck,
  Calculator,
  ClipboardCheck,
  AlarmClock,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/enhanced-button';
import { useOrganizations } from '@/hooks/use-organizations';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

type Role = 'EMPLOYEE' | 'MANAGER' | 'SYSTEM_ADMIN';

type NavigationItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  minRole?: Role;
};

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Engagements', href: '/engagements', icon: Briefcase },
  { name: 'Onboarding', href: '/onboarding', icon: ClipboardCheck, minRole: 'MANAGER' },
  { name: 'Autopilot', href: '/autopilot', icon: AlarmClock, minRole: 'MANAGER' },
  { name: 'Audit Workspace', href: '/audit/controls', icon: ShieldCheck, minRole: 'MANAGER' },
  { name: 'Accounting Close', href: '/accounting', icon: Calculator, minRole: 'MANAGER' },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Knowledge', href: '/knowledge/repositories', icon: BookOpen, minRole: 'MANAGER' },
  { name: 'Agent Configuration', href: '/agents/configuration', icon: Bot, minRole: 'MANAGER' },
  { name: 'Agent Learning', href: '/agents/learning', icon: Sparkles, minRole: 'MANAGER' },
  { name: 'Tax (Malta CIT)', href: '/tax/malta-cit', icon: FileText, minRole: 'MANAGER' },
  { name: 'Tax (VAT & OSS)', href: '/tax/vat-oss', icon: FileText, minRole: 'MANAGER' },
  { name: 'Tax (DAC6)', href: '/tax/dac6', icon: FileText, minRole: 'MANAGER' },
  { name: 'Tax (Pillar Two)', href: '/tax/pillar-two', icon: FileText, minRole: 'MANAGER' },
  { name: 'Tax (Treaty & WHT)', href: '/tax/treaty-wht', icon: FileText, minRole: 'MANAGER' },
  { name: 'Advanced Analytics', href: '/analytics', icon: BarChart3, minRole: 'MANAGER' },
  { name: 'Telemetry', href: '/telemetry', icon: Activity, minRole: 'MANAGER' },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Activity', href: '/activity', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings, minRole: 'MANAGER' },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { orgSlug } = useParams();
  const { currentOrg, memberships } = useOrganizations();
  const currentMembership = currentOrg
    ? memberships.find((membership) => membership.org_id === currentOrg.id)
    : null;
  const userRole = currentMembership?.role ?? null;

  const roleHierarchy: Record<Role, number> = { EMPLOYEE: 1, MANAGER: 2, SYSTEM_ADMIN: 3 };

  const userRoleLevel = userRole ? roleHierarchy[userRole as Role] ?? 0 : 0;

  const filteredNavigation = navigation.filter((item) => {
    if (!item.minRole) return true;
    return userRoleLevel >= roleHierarchy[item.minRole];
  });

  const isActive = (href: string) => {
    const path = location.pathname;
    if (href === '/dashboard') {
      return path.endsWith('/dashboard');
    }
    return path.includes(href);
  };

  const getNavItemVariants = (isActive: boolean) => ({
    rest: { 
      backgroundColor: 'transparent',
      scale: 1,
    },
    hover: { 
      backgroundColor: isActive ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--accent))',
      scale: 1.02,
      transition: { duration: 0.2 }
    },
    tap: { 
      scale: 0.98 
    }
  });

  return (
    <motion.div 
      className="h-full bg-card border-r border-border shadow-glass flex flex-col"
      initial={false}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            layout
          >
            <div className="w-8 h-8 bg-gradient-aurora rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <h1 className="font-semibold text-lg gradient-text whitespace-nowrap">
                    {currentOrg?.name}
                  </h1>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="shrink-0"
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Role badge */}
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="mt-2"
            >
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-primary text-primary-foreground">
                {userRole?.replace('_', ' ')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {filteredNavigation.map((item, index) => {
          const active = isActive(item.href);
          const baseSlug = currentOrg?.slug ?? orgSlug ?? '';
          const href = baseSlug ? `/${baseSlug}${item.href}` : item.href;
          
          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <NavLink
                to={href}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive || active 
                    ? "bg-primary text-primary-foreground shadow-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <motion.div
                  variants={getNavItemVariants(active)}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                  className="flex items-center gap-3 w-full"
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      {/* System Admin Panel Link */}
      {userRole === 'SYSTEM_ADMIN' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="p-4 border-t border-border"
        >
          <NavLink
            to="/admin/system"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-tertiary hover:bg-tertiary/10 transition-colors"
          >
            <Settings className="w-5 h-5 shrink-0" />
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  System Admin
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        </motion.div>
      )}
    </motion.div>
  );
}
