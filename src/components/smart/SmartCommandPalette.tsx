import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

interface CommandAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
  category?: string;
}

export function SmartCommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const actions: CommandAction[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      action: () => navigate('/'),
      keywords: ['home', 'overview'],
      category: 'Navigation',
    },
    {
      id: 'nav-documents',
      label: 'Go to Documents',
      action: () => navigate('/documents'),
      keywords: ['files', 'docs'],
      category: 'Navigation',
    },
    {
      id: 'nav-tasks',
      label: 'Go to Tasks',
      action: () => navigate('/tasks'),
      keywords: ['todos', 'work'],
      category: 'Navigation',
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      action: () => navigate('/settings'),
      keywords: ['preferences', 'config'],
      category: 'Navigation',
    },
    // Actions
    {
      id: 'new-document',
      label: 'Create New Document',
      action: () => console.log('New document'),
      keywords: ['add', 'create', 'file'],
      category: 'Actions',
    },
    {
      id: 'new-task',
      label: 'Create New Task',
      action: () => console.log('New task'),
      keywords: ['add', 'create', 'todo'],
      category: 'Actions',
    },
  ];

  const handleSelect = useCallback((action: CommandAction) => {
    setOpen(false);
    action.action();
  }, []);

  // Group actions by category
  const groupedActions = actions.reduce((acc, action) => {
    const category = action.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(action);
    return acc;
  }, {} as Record<string, CommandAction[]>);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground border rounded-lg hover:bg-accent transition-colors"
      >
        <Command className="h-4 w-4" />
        <span>Quick actions</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Command palette dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Object.entries(groupedActions).map(([category, items], index) => (
            <div key={category}>
              {index > 0 && <CommandSeparator />}
              <CommandGroup heading={category}>
                {items.map((action) => (
                  <CommandItem
                    key={action.id}
                    onSelect={() => handleSelect(action)}
                  >
                    {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                    <span>{action.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
