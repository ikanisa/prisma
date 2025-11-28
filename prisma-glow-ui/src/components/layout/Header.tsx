import { Search, Bell, User, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  compact?: boolean;
}

export function Header({ compact }: HeaderProps) {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className={cn(
      'bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800',
      compact ? 'h-14' : 'h-16'
    )}>
      <div className="h-full flex items-center justify-between px-4 md:px-6">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <button
            onClick={() => {
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm flex-1 text-left">Search...</span>
            <kbd className="hidden sm:inline-block text-xs bg-white dark:bg-neutral-900 px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-600">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            ) : (
              <Moon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            )}
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <Bell className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User menu */}
          <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="hidden md:inline text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Admin
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
