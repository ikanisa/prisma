/**
 * System tray menu configuration component.
 * Handles events from the system tray and provides quick actions.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTauri } from '@/hooks/useTauri';

interface SystemTrayMenuProps {
  /** Callback when sync is requested from tray */
  onSync?: () => void;
  /** Callback when AI dialog is requested */
  onOpenAIDialog?: () => void;
  /** Callback when new task is requested */
  onNewTask?: () => void;
}

export function SystemTrayMenu({
  onSync,
  onOpenAIDialog,
  onNewTask,
}: SystemTrayMenuProps) {
  const { isTauri, listen } = useTauri();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isTauri) return;

    const unlisteners: Array<() => void> = [];

    const setupListeners = async () => {
      // Listen for navigation events from tray
      const unlistenNavigate = await listen<string>('navigate', (event) => {
        navigate(event.payload);
      });
      unlisteners.push(unlistenNavigate);

      // Listen for sync trigger
      const unlistenSync = await listen('trigger-sync', () => {
        onSync?.();
      });
      unlisteners.push(unlistenSync);

      // Listen for AI dialog open
      const unlistenAI = await listen('open-ai-dialog', () => {
        onOpenAIDialog?.();
      });
      unlisteners.push(unlistenAI);

      // Listen for new task
      const unlistenNewTask = await listen('open-new-task', () => {
        onNewTask?.();
      });
      unlisteners.push(unlistenNewTask);
    };

    setupListeners();

    return () => {
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [isTauri, navigate, onSync, onOpenAIDialog, onNewTask, listen]);

  // This component doesn't render anything visible
  // It just sets up event listeners for tray interactions
  return null;
}

export default SystemTrayMenu;
