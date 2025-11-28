/**
 * Keyboard Shortcuts Hook
 * Phase 4-5: Power user keyboard navigation
 */

import { useEffect } from 'react';

type KeyCombo = string; // e.g., "cmd+k", "ctrl+shift+p"

interface ShortcutConfig {
  key: KeyCombo;
  callback: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const { key, callback, preventDefault = true } of shortcuts) {
        if (matchesShortcut(event, key)) {
          if (preventDefault) {
            event.preventDefault();
          }
          callback(event);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

function matchesShortcut(event: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);

  // Check key match
  const keyMatches = 
    event.key.toLowerCase() === key || 
    event.code.toLowerCase().replace('key', '') === key;

  if (!keyMatches) return false;

  // Check modifiers
  const hasCtrl = modifiers.includes('ctrl') || modifiers.includes('control');
  const hasCmd = modifiers.includes('cmd') || modifiers.includes('meta');
  const hasShift = modifiers.includes('shift');
  const hasAlt = modifiers.includes('alt') || modifiers.includes('option');

  return (
    (!hasCtrl && !hasCmd || event.ctrlKey || event.metaKey) &&
    (!hasShift || event.shiftKey) &&
    (!hasAlt || event.altKey)
  );
}

// Pre-defined shortcuts
export const SHORTCUTS = {
  COMMAND_PALETTE: 'cmd+k',
  SEARCH: 'cmd+/',
  NEW_DOCUMENT: 'cmd+n',
  NEW_TASK: 'cmd+shift+t',
  SETTINGS: 'cmd+,',
  HELP: 'cmd+?',
  CLOSE: 'esc',
} as const;
