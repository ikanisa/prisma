/**
 * Hook to detect Tauri environment and provide access to Tauri APIs.
 * Falls back gracefully in web environments.
 * Supports both Tauri v1 and v2 APIs.
 */

import { useCallback, useEffect, useState } from 'react';

interface TauriHook {
  /** Whether we're running in a Tauri environment */
  isTauri: boolean;
  /** Invoke a Tauri command */
  invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
  /** Listen to Tauri events */
  listen: <T>(event: string, callback: (event: { payload: T }) => void) => Promise<() => void>;
  /** Emit a Tauri event */
  emit: (event: string, payload?: unknown) => Promise<void>;
}

/**
 * Check if we're running in a Tauri environment
 */
function checkIsTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    '__TAURI__' in window &&
    typeof (window as Record<string, unknown>).__TAURI__ !== 'undefined'
  );
}

export function useTauri(): TauriHook {
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    setIsTauri(checkIsTauri());
  }, []);

  const invoke = useCallback(async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
    if (!isTauri) {
      console.warn(`Tauri command '${cmd}' called but not in Tauri environment`);
      throw new Error('Not in Tauri environment');
    }

    try {
      // Try Tauri v2 API first
      const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
      return await tauriInvoke<T>(cmd, args);
    } catch {
      try {
        // Fallback to Tauri v1 API
        const { invoke: tauriInvoke } = await import('@tauri-apps/api/tauri');
        return await tauriInvoke<T>(cmd, args);
      } catch (error) {
        console.error(`Failed to invoke Tauri command '${cmd}':`, error);
        throw error;
      }
    }
  }, [isTauri]);

  const listen = useCallback(async <T,>(
    event: string,
    callback: (event: { payload: T }) => void
  ): Promise<() => void> => {
    if (!isTauri) {
      console.warn(`Tauri event '${event}' listener registered but not in Tauri environment`);
      return () => {};
    }

    try {
      const { listen: tauriListen } = await import('@tauri-apps/api/event');
      return await tauriListen<T>(event, callback);
    } catch (error) {
      console.error(`Failed to listen to Tauri event '${event}':`, error);
      return () => {};
    }
  }, [isTauri]);

  const emit = useCallback(async (event: string, payload?: unknown): Promise<void> => {
    if (!isTauri) {
      console.warn(`Tauri event '${event}' emitted but not in Tauri environment`);
      return;
    }

    try {
      const { emit: tauriEmit } = await import('@tauri-apps/api/event');
      await tauriEmit(event, payload);
    } catch (error) {
      console.error(`Failed to emit Tauri event '${event}':`, error);
    }
  }, [isTauri]);

  return {
    isTauri,
    invoke,
    listen,
    emit,
  };
}

export default useTauri;
