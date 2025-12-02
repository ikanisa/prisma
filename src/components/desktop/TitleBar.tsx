/**
 * Custom frameless window title bar for Tauri desktop app.
 * Provides window controls (minimize, maximize, close) and drag region.
 */

import { useEffect, useState, useCallback } from 'react';
import { Minus, Square, X, Menu, RefreshCw, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTauri } from '@/hooks/useTauri';

interface WindowState {
  is_maximized: boolean;
  is_fullscreen: boolean;
  is_minimized: boolean;
  is_visible: boolean;
  is_focused: boolean;
}

interface TitleBarProps {
  /** Title to display in the title bar */
  title?: string;
  /** Whether to show the sync button */
  showSync?: boolean;
  /** Callback when sync is requested */
  onSync?: () => void;
  /** Whether sync is in progress */
  isSyncing?: boolean;
}

export function TitleBar({
  title = 'Prisma Glow',
  showSync = true,
  onSync,
  isSyncing = false,
}: TitleBarProps) {
  const { isTauri, invoke, listen } = useTauri();
  const [isMaximized, setIsMaximized] = useState(false);

  // Fetch window state
  const fetchWindowState = useCallback(async () => {
    if (!isTauri) return;
    try {
      const state = await invoke<WindowState>('get_window_state');
      setIsMaximized(state.is_maximized);
    } catch {
      // Command might not be available yet
    }
  }, [isTauri, invoke]);

  useEffect(() => {
    if (!isTauri) return;

    // Check initial state
    fetchWindowState();

    // Listen for window events to update maximized state
    let unlistenResize: (() => void) | undefined;
    
    const setupListener = async () => {
      try {
        // In Tauri v2, we can listen for window events
        unlistenResize = await listen('tauri://resize', () => {
          fetchWindowState();
        });
      } catch {
        // Fallback: poll for state changes
      }
    };

    setupListener();

    return () => {
      unlistenResize?.();
    };
  }, [isTauri, listen, fetchWindowState]);

  const handleMinimize = async () => {
    try {
      await invoke('minimize_window');
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      await invoke('maximize_window');
      // Update state after action
      setTimeout(fetchWindowState, 100);
    } catch (error) {
      console.error('Failed to maximize window:', error);
    }
  };

  const handleClose = async () => {
    try {
      await invoke('close_window');
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  // Don't render if not in Tauri environment
  if (!isTauri) {
    return null;
  }

  return (
    <div
      data-tauri-drag-region
      className="h-8 flex items-center justify-between bg-background/95 backdrop-blur border-b border-border select-none"
    >
      {/* Left: App Menu & Title */}
      <div className="flex items-center gap-2 px-3" data-tauri-drag-region>
        <Menu className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium" data-tauri-drag-region>
          {title}
        </span>
      </div>

      {/* Center: Can be used for breadcrumbs or tabs */}
      <div
        className="flex-1 flex justify-center"
        data-tauri-drag-region
      >
        {/* Reserved for future use */}
      </div>

      {/* Right: Actions & Window Controls */}
      <div className="flex items-center">
        {/* Sync button */}
        {showSync && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-none hover:bg-muted"
            onClick={onSync}
            disabled={isSyncing}
            title="Sync"
          >
            <RefreshCw
              className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`}
            />
          </Button>
        )}

        {/* Window controls */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-12 rounded-none hover:bg-muted"
          onClick={handleMinimize}
          title="Minimize"
        >
          <Minus className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-12 rounded-none hover:bg-muted"
          onClick={handleMaximize}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Copy className="w-3 h-3" />
          ) : (
            <Square className="w-3 h-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-12 rounded-none hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleClose}
          title="Close"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export default TitleBar;
