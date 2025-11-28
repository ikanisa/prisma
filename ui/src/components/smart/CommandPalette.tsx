/**
 * Command Palette - ⌘K Quick Actions
 * Phase 4-5: Smart, AI-powered command interface
 */

import { useCallback, useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, CheckSquare, Users, Settings, Search,
  Sparkles, Plus, Home, Calendar, Briefcase,
  type LucideIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { modalVariants } from '@/lib/animations';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  action: () => void;
  category: 'navigation' | 'actions' | 'ai' | 'recent';
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // ⌘K to open
  useKeyboardShortcuts([
    {
      key: 'cmd+k',
      callback: () => setOpen(true),
    },
    {
      key: 'ctrl+k',
      callback: () => setOpen(true),
    },
  ]);

  // Commands configuration
  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Dashboard',
      icon: Home,
      category: 'navigation',
      action: () => {
        navigate('/dashboard');
        setOpen(false);
      },
    },
    {
      id: 'nav-documents',
      label: 'Documents',
      icon: FileText,
      category: 'navigation',
      action: () => {
        navigate('/documents');
        setOpen(false);
      },
    },
    {
      id: 'nav-tasks',
      label: 'Tasks',
      icon: CheckSquare,
      category: 'navigation',
      action: () => {
        navigate('/tasks');
        setOpen(false);
      },
    },
    {
      id: 'nav-clients',
      label: 'Clients',
      icon: Users,
      category: 'navigation',
      action: () => {
        navigate('/clients');
        setOpen(false);
      },
    },
    {
      id: 'nav-settings',
      label: 'Settings',
      icon: Settings,
      shortcut: '⌘,',
      category: 'navigation',
      action: () => {
        navigate('/settings');
        setOpen(false);
      },
    },

    // Quick Actions
    {
      id: 'action-new-doc',
      label: 'New Document',
      icon: Plus,
      shortcut: '⌘N',
      category: 'actions',
      action: () => {
        // TODO: Open new document modal
        setOpen(false);
      },
    },
    {
      id: 'action-new-task',
      label: 'New Task',
      icon: Plus,
      shortcut: '⌘⇧T',
      category: 'actions',
      action: () => {
        // TODO: Open new task modal
        setOpen(false);
      },
    },

    // AI Features
    {
      id: 'ai-assistant',
      label: 'Ask AI Assistant',
      icon: Sparkles,
      category: 'ai',
      action: () => {
        // TODO: Open AI chat
        setOpen(false);
      },
    },
    {
      id: 'ai-summarize',
      label: 'Summarize Current Page',
      icon: Sparkles,
      category: 'ai',
      action: () => {
        // TODO: AI summarize
        setOpen(false);
      },
    },
  ];

  // Filter commands based on search
  const filteredCommands = search
    ? commands.filter((cmd) =>
        cmd.label.toLowerCase().includes(search.toLowerCase())
      )
    : commands;

  // Group by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Command Palette */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2"
          >
            <Command
              className="rounded-lg border bg-popover shadow-2xl"
              shouldFilter={false}
            >
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <Command.Input
                  placeholder="Type a command or search..."
                  value={search}
                  onValueChange={setSearch}
                  className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
                <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">ESC</span>
                </kbd>
              </div>

              <Command.List className="max-h-[400px] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>

                {Object.entries(groupedCommands).map(([category, items]) => (
                  <Command.Group
                    key={category}
                    heading={category.charAt(0).toUpperCase() + category.slice(1)}
                    className="mb-2"
                  >
                    {items.map((cmd) => (
                      <Command.Item
                        key={cmd.id}
                        onSelect={cmd.action}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2',
                          'cursor-pointer select-none',
                          'hover:bg-accent hover:text-accent-foreground',
                          'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
                          'transition-colors'
                        )}
                      >
                        <cmd.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 text-sm">{cmd.label}</span>
                        {cmd.shortcut && (
                          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
