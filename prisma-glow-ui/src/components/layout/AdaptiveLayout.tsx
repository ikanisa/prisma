import { ReactNode } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import { CommandPalette } from '@/components/smart/CommandPalette';
import { FloatingAssistant } from '@/components/smart/FloatingAssistant';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, FileText, CheckSquare, Users, Settings,
  Menu, X, Sparkles, Search, Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdaptiveLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/' },
  { icon: FileText, label: 'Documents', href: '/documents' },
  { icon: CheckSquare, label: 'Tasks', href: '/tasks' },
  { icon: Users, label: 'Team', href: '/team' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function AdaptiveLayout({ children }: AdaptiveLayoutProps) {
  const { isMobile, isDesktop } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState('/');

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Global Components */}
      <CommandPalette />
      <FloatingAssistant />

      {/* Desktop Sidebar */}
      {isDesktop && (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 p-4 z-30">
          {/* Logo */}
          <div className="flex items-center gap-2 px-3 mb-8">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-neutral-900 dark:text-neutral-100">
              Prisma Glow
            </span>
          </div>

          {/* Search */}
          <button
            onClick={() => {/* Open command palette */}}
            className="w-full flex items-center gap-2 px-3 py-2 mb-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-left"
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Search...</span>
            <kbd className="ml-auto px-1.5 py-0.5 text-xs bg-white dark:bg-neutral-900 rounded border border-neutral-300 dark:border-neutral-700">
              ⌘K
            </kbd>
          </button>

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveRoute(item.href);
                }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  activeRoute === item.href
                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </a>
            ))}
          </nav>

          {/* User Profile */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  John Doe
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  john@example.com
                </p>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Mobile Header */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 flex items-center justify-between z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-neutral-900 dark:text-neutral-100">
              Prisma Glow
            </span>
          </div>

          <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
            <Bell className="h-6 w-6" />
          </button>
        </header>
      )}

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-neutral-900 p-4 z-50"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-bold text-lg text-neutral-900 dark:text-neutral-100">
                    Prisma Glow
                  </span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveRoute(item.href);
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                      activeRoute === item.href
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </a>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn(
        isMobile ? 'pt-16' : 'pl-64'
      )}>
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-4 flex items-center justify-around z-30">
          {navItems.slice(0, 4).map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                setActiveRoute(item.href);
              }}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
                activeRoute === item.href
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-neutral-600 dark:text-neutral-400'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
