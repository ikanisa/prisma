
import React from 'react';
import { WifiOff, Wifi, Clock } from 'lucide-react';
import { useOfflineSupport } from '@/hooks/useOfflineSupport';

const OfflineIndicator: React.FC = () => {
  const { isOnline, queuedItemsCount, isProcessingQueue } = useOfflineSupport();

  if (isOnline && queuedItemsCount === 0) {
    return null;
  }

  return (
    <div className={`fixed top-4 left-4 z-40 rounded-lg px-3 py-2 text-sm font-medium shadow-lg ${
      isOnline 
        ? 'bg-green-500 text-white' 
        : 'bg-orange-500 text-white'
    }`}>
      <div className="flex items-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            {isProcessingQueue ? (
              <span>Syncing data...</span>
            ) : queuedItemsCount > 0 ? (
              <span>Connected - {queuedItemsCount} items synced</span>
            ) : (
              <span>Connected</span>
            )}
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Offline mode</span>
            {queuedItemsCount > 0 && (
              <>
                <Clock className="w-4 h-4 ml-2" />
                <span>{queuedItemsCount} pending</span>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;
