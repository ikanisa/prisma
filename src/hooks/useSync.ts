/**
 * React hook for offline sync functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { syncService, SyncResult } from '../services/sync';
import { isDesktop } from '../lib/platform';

export interface UseSyncReturn {
  /** Whether a sync is currently in progress */
  isSyncing: boolean;
  /** Number of pending changes */
  pendingCount: number;
  /** Last sync result */
  lastResult: SyncResult | null;
  /** Manually trigger a sync */
  sync: () => Promise<SyncResult>;
  /** Queue a change for sync */
  queueChange: (
    table: string,
    operation: 'insert' | 'update' | 'delete',
    recordId: string,
    data: any
  ) => Promise<number>;
  /** Get cached data */
  getCached: <T>(table: string, id: string) => Promise<T | null>;
  /** Cache data */
  cache: (table: string, id: string, data: any) => Promise<void>;
}

export function useSync(): UseSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  // Update pending count periodically
  useEffect(() => {
    if (!isDesktop()) return;

    const updatePendingCount = async () => {
      const changes = await syncService.getPendingChanges();
      setPendingCount(changes.length);
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 30000); // Every 30s

    return () => clearInterval(interval);
  }, []);

  const sync = useCallback(async (): Promise<SyncResult> => {
    setIsSyncing(true);
    try {
      const result = await syncService.syncToServer();
      setLastResult(result);
      
      // Update pending count
      const changes = await syncService.getPendingChanges();
      setPendingCount(changes.length);
      
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const queueChange = useCallback(
    async (
      table: string,
      operation: 'insert' | 'update' | 'delete',
      recordId: string,
      data: any
    ): Promise<number> => {
      const id = await syncService.queueChange({
        table_name: table,
        operation,
        record_id: recordId,
        data: JSON.stringify(data),
      });

      // Update pending count
      setPendingCount((prev) => prev + 1);

      return id;
    },
    []
  );

  const getCached = useCallback(
    async <T,>(table: string, id: string): Promise<T | null> => {
      return syncService.getCachedEntity<T>(table, id);
    },
    []
  );

  const cache = useCallback(
    async (table: string, id: string, data: any): Promise<void> => {
      return syncService.cacheEntity(table, id, data);
    },
    []
  );

  return {
    isSyncing,
    pendingCount,
    lastResult,
    sync,
    queueChange,
    getCached,
    cache,
  };
}
