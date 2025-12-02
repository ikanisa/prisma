/**
 * Sync Manager for Desktop App
 * Handles bidirectional sync between local SQLite and Supabase
 */

'use client';

import { useState, useEffect } from 'react';
import { isTauri } from '@/lib/desktop/tauri';

interface SyncStatus {
  lastSync: Date | null;
  isSyncing: boolean;
  error: string | null;
  itemsSynced: number;
}

export function useSyncManager() {
  const [status, setStatus] = useState<SyncStatus>({
    lastSync: null,
    isSyncing: false,
    error: null,
    itemsSynced: 0,
  });

  // Auto-sync every 5 minutes
  useEffect(() => {
    if (!isTauri()) return;

    const interval = setInterval(() => {
      syncData();
    }, 5 * 60 * 1000); // 5 minutes

    // Initial sync
    syncData();

    return () => clearInterval(interval);
  }, []);

  const syncData = async () => {
    if (!isTauri()) return;

    setStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const { invoke } = await import('@tauri-apps/api/tauri');
      
      // Get auth token
      const token: any = await invoke('get_stored_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Use full bidirectional sync
      const result: any = await invoke('sync_all_data', {
        authToken: token.access_token,
      });

      setStatus({
        lastSync: new Date(),
        isSyncing: false,
        error: result.errors.length > 0 ? result.errors[0] : null,
        itemsSynced: result.downloaded + result.uploaded,
      });
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      }));
    }
  };

  return {
    status,
    syncNow: syncData,
  };
}

// Sync Status Component
export function SyncStatusBar() {
  const { status, syncNow } = useSyncManager();

  if (!isTauri()) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 text-xs">
      <div className={`w-2 h-2 rounded-full ${
        status.isSyncing ? 'bg-blue-500 animate-pulse' :
        status.error ? 'bg-red-500' :
        'bg-green-500'
      }`} />
      
      {status.isSyncing && <span>Syncing...</span>}
      {status.error && <span className="text-destructive">{status.error}</span>}
      {!status.isSyncing && !status.error && status.lastSync && (
        <span>Last sync: {status.lastSync.toLocaleTimeString()}</span>
      )}

      <button
        onClick={syncNow}
        disabled={status.isSyncing}
        className="ml-auto text-primary hover:underline disabled:opacity-50"
      >
        Sync Now
      </button>
    </div>
  );
}
