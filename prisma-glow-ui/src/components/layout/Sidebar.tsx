import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Bot, FileText, CheckSquare, Users, Settings,
  ChevronRight, ChevronLeft, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
  children?: { label: string; path: string }[];
}

const navigation: NavItem[] = [
  { id: 'home', label: 'Dashboard', icon: Home, path: '/' },
  { 
    id: 'agents', 
    label: 'AI Agents', 
    icon: Bot, 
    path: '/agents',
    badge: 47,
    children: [
      { label: 'Orchestrators', path: '/agents/orchestrators' },
      { label: 'Accounting', path: '/agents/accounting' },
      { label: 'Audit', path: '/agents/audit' },
      { label: 'Tax', path: '/agents/tax' },
      { label: 'Corporate', path: '/agents/corporate' },
    ],
  },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, path: '/tasks', badge: 12 },
  { id: 'documents', label: 'Documents', icon: FileText, path: '/documents' },
  { id: 'team', label: 'Team', icon: Users, path: '/team' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [activePath, setActivePath] = useState('/');

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-screen bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-bold text-lg text-neutral-900 dark:text-neutral-100"
              >
                Prisma Glow
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              collapsed={collapsed}
              expanded={expandedItem === item.id}
              onExpand={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
              active={activePath === item.path || item.children?.some(c => activePath === c.path)}
              onNavigate={(path) => setActivePath(path)}
            />
          ))}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          )}
        </button>
      </div>
    </motion.aside>
  );
}

interface NavItemProps {
  item: NavItem;
  collapsed: boolean;
  expanded: boolean;
  onExpand: () => void;
  active: boolean;
  onNavigate: (path: string) => void;
}

function NavItem({ item, collapsed, expanded, onExpand, active, onNavigate }: NavItemProps) {
  const hasChildren = item.children && item.children.length > 0;

  return (
    <li>
      <button
        onClick={() => {
          if (hasChildren) {
            onExpand();
          } else {
            onNavigate(item.path);
          }
        }}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
          active
            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
            : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
            {item.badge && <Badge variant="default" size="sm">{item.badge}</Badge>}
            {hasChildren && (
              <ChevronRight
                className={cn(
                  'w-4 h-4 transition-transform',
                  expanded && 'rotate-90'
                )}
              />
            )}
          </>
        )}
      </button>

      {/* Children */}
      <AnimatePresence>
        {!collapsed && expanded && hasChildren && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="ml-8 mt-1 space-y-1 overflow-hidden"
          >
            {item.children!.map((child) => (
              <li key={child.path}>
                <button
                  onClick={() => onNavigate(child.path)}
                  className={cn(
                    'w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors',
                    activePath === child.path
                      ? 'text-primary-700 dark:text-primary-400'
                      : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                  )}
                >
                  {child.label}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

let activePath = '/';
