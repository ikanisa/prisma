import { motion } from 'framer-motion';
import { Home, Bot, CheckSquare, FileText, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Bot, label: 'Agents', path: '/agents' },
  { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
  { icon: FileText, label: 'Docs', path: '/documents' },
  { icon: Menu, label: 'More', path: '/more' },
];

export function MobileNav() {
  const activePath = '/';

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-t border-neutral-200 dark:border-neutral-800 z-50 safe-area-pb">
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map((item) => {
          const isActive = activePath === item.path;

          return (
            <button
              key={item.path}
              className="flex flex-col items-center justify-center flex-1 h-full relative"
              aria-label={item.label}
            >
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                className={cn(
                  'flex flex-col items-center gap-1',
                  isActive ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-600 dark:text-neutral-400'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </motion.div>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 h-0.5 w-12 bg-primary-600 dark:bg-primary-400 rounded-t-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
