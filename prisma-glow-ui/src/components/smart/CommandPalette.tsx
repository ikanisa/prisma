import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Command, 
  Search, 
  FileText, 
  CheckSquare, 
  Users, 
  Settings,
  Clock,
  Hash,
  ArrowRight
} from 'lucide-react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  category: 'navigation' | 'actions' | 'recent';
}

const mockCommands: CommandItem[] = [
  { id: '1', title: 'Dashboard', icon: Command, action: () => {}, category: 'navigation' },
  { id: '2', title: 'Documents', icon: FileText, action: () => {}, category: 'navigation' },
  { id: '3', title: 'Tasks', icon: CheckSquare, action: () => {}, category: 'navigation' },
  { id: '4', title: 'Team', icon: Users, action: () => {}, category: 'navigation' },
  { id: '5', title: 'Settings', icon: Settings, action: () => {}, category: 'navigation' },
  { id: '6', title: 'New Document', subtitle: 'Create a new document', icon: FileText, action: () => {}, category: 'actions' },
  { id: '7', title: 'New Task', subtitle: 'Create a new task', icon: CheckSquare, action: () => {}, category: 'actions' },
  { id: '8', title: 'Recent: Project Alpha', icon: Clock, action: () => {}, category: 'recent' },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(0);
  const containerRef = useFocusTrap<HTMLDivElement>(isOpen);

  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      callback: () => setIsOpen(prev => !prev),
      description: 'Toggle command palette',
    },
    {
      key: 'Escape',
      callback: () => isOpen && setIsOpen(false),
    },
  ]);

  const filteredCommands = mockCommands.filter(cmd =>
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.subtitle?.toLowerCase().includes(search.toLowerCase())
  );

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelected(0);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter' && filteredCommands[selected]) {
      e.preventDefault();
      filteredCommands[selected].action();
      setIsOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Command Palette */}
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
            <motion.div
              ref={containerRef}
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                <Search className="h-5 w-5 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent border-none outline-none text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
                  autoFocus
                />
                <kbd className="px-2 py-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto p-2">
                {filteredCommands.length === 0 ? (
                  <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
                    <p className="text-sm">No results found</p>
                  </div>
                ) : (
                  Object.entries(groupedCommands).map(([category, commands]) => (
                    <div key={category} className="mb-4">
                      <div className="px-3 py-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        {category}
                      </div>
                      {commands.map((cmd, i) => {
                        const globalIndex = filteredCommands.indexOf(cmd);
                        return (
                          <button
                            key={cmd.id}
                            onClick={() => {
                              cmd.action();
                              setIsOpen(false);
                            }}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
                              globalIndex === selected
                                ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                            )}
                          >
                            <cmd.icon className="h-5 w-5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{cmd.title}</div>
                              {cmd.subtitle && (
                                <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                  {cmd.subtitle}
                                </div>
                              )}
                            </div>
                            {globalIndex === selected && (
                              <ArrowRight className="h-4 w-4 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <div className="flex items-center gap-4">
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-700">↑↓</kbd> Navigate
                    </span>
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-700">↵</kbd> Select
                    </span>
                  </div>
                  <span>
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-700">⌘K</kbd> to toggle
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
