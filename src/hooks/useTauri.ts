/**
 * Hook to detect Tauri environment and provide access to Tauri APIs.
 * Falls back gracefully in web environments.
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

export function useTauri(): TauriHook {
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    // Check if we're in a Tauri environment
    const checkTauri = () => {
      // @ts-expect-error - __TAURI__ is injected by Tauri
      return typeof window !== 'undefined' && typeof window.__TAURI__ !== 'undefined';
    };
    setIsTauri(checkTauri());
  }, []);

  const invoke = useCallback(async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
    if (!isTauri) {
      console.warn(`Tauri command '${cmd}' called but not in Tauri environment`);
      throw new Error('Not in Tauri environment');
    }

    try {
      const { invoke: tauriInvoke } = await import('@tauri-apps/api/tauri');
      return await tauriInvoke<T>(cmd, args);
    } catch (error) {
      console.error(`Failed to invoke Tauri command '${cmd}':`, error);
      throw error;
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
