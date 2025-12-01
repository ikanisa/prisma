'use client';

import { WifiOff } from 'lucide-react';
import { useOffline } from '@/hooks/use-offline';

export function OfflineIndicator() {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-4 py-2 shadow-lg">
      <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm font-medium">
          You&apos;re offline. Some features may be unavailable.
        </span>
      </div>
    </div>
  );
}
