'use client';

import { WifiOff, Wifi } from 'lucide-react';
import { useOffline } from '@/hooks/use-offline';
import { SyncStatus } from './sync-status';

export function OfflineIndicator() {
  const { isOffline } = useOffline();

  return (
    <>
      {isOffline ? (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-4 py-2 shadow-lg">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">
              You&apos;re offline. Changes will sync when connection is restored.
            </span>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-green-500/50 bg-green-500/10 px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2">
            <Wifi className="h-3 w-3 text-green-600 dark:text-green-400" />
            <SyncStatus className="text-xs" />
          </div>
        </div>
      )}
    </>
  );
}
