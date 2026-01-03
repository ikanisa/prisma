'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { getSyncStatus, syncOfflineActions } from '@/lib/pwa/sync';
import { initDB } from '@/lib/pwa/db';

interface SyncStatusProps {
  className?: string;
}

export function SyncStatus({ className }: SyncStatusProps) {
  const [status, setStatus] = useState<{
    pendingActions: number;
    unsyncedDocuments: number;
    cacheSize: number;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize DB and load status
    initDB()
      .then(() => getSyncStatus())
      .then(setStatus)
      .catch((err) => setError(err.message));

    // Refresh status every 30 seconds
    const interval = setInterval(() => {
      getSyncStatus()
        .then(setStatus)
        .catch((err) => setError(err.message));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);

    try {
      await initDB();
      const result = await syncOfflineActions();
      
      if (result.success) {
        setLastSync(new Date());
        // Refresh status
        const newStatus = await getSyncStatus();
        setStatus(newStatus);
      } else {
        setError(`Sync completed with ${result.failed} failures`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!status) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading sync status...</span>
      </div>
    );
  }

  const hasPending = status.pendingActions > 0 || status.unsyncedDocuments > 0;
  const totalPending = status.pendingActions + status.unsyncedDocuments;

  if (!hasPending && !error) {
    return (
      <div className={`flex items-center gap-2 text-sm text-green-600 dark:text-green-400 ${className}`}>
        <CheckCircle2 className="h-4 w-4" />
        <span>All synced</span>
        {lastSync && (
          <span className="text-xs text-muted-foreground">
            ({lastSync.toLocaleTimeString()})
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {error ? (
        <>
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            ) : (
              <RefreshCw className="h-4 w-4 text-yellow-500" />
            )}
            <span className="text-sm font-medium">
              {totalPending} pending {totalPending === 1 ? 'item' : 'items'}
            </span>
          </div>
          {status.pendingActions > 0 && (
            <span className="text-xs text-muted-foreground">
              {status.pendingActions} action{status.pendingActions !== 1 ? 's' : ''}
            </span>
          )}
          {status.unsyncedDocuments > 0 && (
            <span className="text-xs text-muted-foreground">
              {status.unsyncedDocuments} document{status.unsyncedDocuments !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="ml-2 rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-950"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </>
      )}
    </div>
  );
}

