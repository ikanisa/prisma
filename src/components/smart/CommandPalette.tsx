import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Command, File, CheckSquare, Users, Settings, Sparkles, X,
  Home, Briefcase, Bell, Activity, BarChart3, FileText, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useNavigate, useParams } from 'react-router-dom';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ElementType;
  keywords: string[];
  category: 'navigation' | 'actions' | 'ai' | 'recent';
  onSelect: () => void;
}

export function CommandPalette() {
  const navigate = useNavigate();
  const { orgSlug } = useParams();
  const baseUrl = `/${orgSlug || 'prisma-glow'}`;

  const commands: CommandItem[] = [
    {
      id: 'dashboard',
      label: 'Go to Dashboard',
      icon: Home,
      keywords: ['dashboard', 'home', 'overview'],
      category: 'navigation',
      onSelect: () => navigate(`${baseUrl}/dashboard`),
    },
    {
      id: 'clients',
      label: 'Go to Clients',
      icon: Users,
      keywords: ['clients', 'customers'],
      category: 'navigation',
      onSelect: () => navigate(`${baseUrl}/clients`),
    },
    {
      id: 'engagements',
      label: 'Go to Engagements',
      icon: Briefcase,
      keywords: ['engagements', 'projects'],
      category: 'navigation',
      onSelect: () => navigate(`${baseUrl}/engagements`),
    },
    {
      id: 'documents',
      label: 'Go to Documents',
      icon: File,
      keywords: ['documents', 'files', 'docs'],
      category: 'navigation',
      onSelect: () => navigate(`${baseUrl}/documents`),
    },
    {
      id: 'tasks',
      label: 'Go to Tasks',
      icon: CheckSquare,
      keywords: ['tasks', 'todo', 'checklist'],
      category: 'navigation',
      onSelect: () => navigate(`${baseUrl}/tasks`),
    },
    {
      id: 'notifications',
      label: 'Go to Notifications',
      icon: Bell,
      keywords: ['notifications', 'alerts'],
      category: 'navigation',
      onSelect: () => navigate(`${baseUrl}/notifications`),
    },
    {
      id: 'activity',
      label: 'Go to Activity',
      icon: Activity,
      keywords: ['activity', 'history', 'log'],
      category: 'navigation',
      onSelect: () => navigate(`${baseUrl}/activity`),
    },
    {
      id: 'analytics',
      label: 'Go to Analytics',
      icon: BarChart3,
      keywords: ['analytics', 'reports', 'data'],
      category: 'navigation',
      onSelect: () => navigate(`${baseUrl}/analytics`),
    },
    {
      id: 'settings',
      label: 'Go to Settings',
      icon: Settings,
      keywords: ['settings', 'preferences', 'config'],
      category: 'navigation',
      onSelect: () => navigate(`${baseUrl}/settings`),
    },
    {
      id: 'new-document',
      label: 'Create New Document',
      icon: FileText,
      keywords: ['new', 'create', 'document'],
      category: 'actions',
      onSelect: () => console.log('Create document'),
    },
    {
      id: 'new-task',
      label: 'Create New Task',
      icon: CheckSquare,
      keywords: ['new', 'create', 'task'],
      category: 'actions',
      onSelect: () => console.log('Create task'),
    },
    {
      id: 'ai-suggest',
      label: 'Get AI Suggestions',
      icon: Sparkles,
      keywords: ['ai', 'suggest', 'help', 'assistant'],
      category: 'ai',
      onSelect: () => console.log('Show AI suggestions'),
    },
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState(commands);

  useKeyboardShortcuts([
    {
      key: 'k',
      metaKey: true,
      callback: () => setIsOpen(!isOpen),
      description: 'Open command palette',
    },
    {
      key: 'Escape',
      callback: () => setIsOpen(false),
      description: 'Close command palette',
    },
  ]);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredCommands(commands);
      return;
    }

    const filtered = commands.filter((cmd) =>
      cmd.keywords.some((keyword) =>
        keyword.toLowerCase().includes(search.toLowerCase())
      ) || cmd.label.toLowerCase().includes(search.toLowerCase())
    );

    setFilteredCommands(filtered);
    setSelectedIndex(0);
  }, [search]);

  const handleSelect = (command: CommandItem) => {
    command.onSelect();
    setIsOpen(false);
    setSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleSelect(filteredCommands[selectedIndex]);
        }
        break;
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm',
          'text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="w-full max-w-2xl rounded-lg border bg-popover shadow-2xl"
              >
                <div className="flex items-center gap-3 border-b px-4 py-3">
                  <Search className="h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a command or search..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    autoFocus
                  />
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded p-1 hover:bg-accent"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-[400px] overflow-y-auto p-2">
                  {filteredCommands.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No results found
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredCommands.map((command, index) => (
                        <button
                          key={command.id}
                          onClick={() => handleSelect(command)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                            'hover:bg-accent hover:text-accent-foreground',
                            index === selectedIndex && 'bg-accent text-accent-foreground'
                          )}
                        >
                          <command.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="flex-1">{command.label}</span>
                          {command.category === 'ai' && (
                            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t px-4 py-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Use ↑↓ to navigate</span>
                    <span>↵ to select</span>
                    <span>ESC to close</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
