import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getOfflineQueueSnapshot,
  OFFLINE_QUEUE_STORAGE_KEY,
  OFFLINE_QUEUE_UPDATED_EVENT,
  processQueuedActions,
  queueAction,
  type QueuedOfflineAction,
} from '@/utils/pwa';

function readQueue(): QueuedOfflineAction[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    return getOfflineQueueSnapshot();
  } catch {
    return [];
  }
}

export interface UseOfflineSupportOptions {
  autoProcessOnReconnect?: boolean;
}

export interface UseOfflineSupportResult {
  queue: QueuedOfflineAction[];
  queueLength: number;
  hasPendingActions: boolean;
  enqueueAction: (action: string, data: unknown) => number;
  processQueue: () => Promise<number>;
}

export function useOfflineSupport({ autoProcessOnReconnect = false }: UseOfflineSupportOptions = {}): UseOfflineSupportResult {
  const [queue, setQueue] = useState<QueuedOfflineAction[]>(() => readQueue());

  const refreshQueue = useCallback(() => {
    setQueue(readQueue());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleQueueUpdated: EventListener = () => {
      refreshQueue();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === OFFLINE_QUEUE_STORAGE_KEY) {
        refreshQueue();
      }
    };

    window.addEventListener(OFFLINE_QUEUE_UPDATED_EVENT, handleQueueUpdated);
    window.addEventListener('storage', handleStorage);

    let handleOnline: (() => void) | undefined;
    if (autoProcessOnReconnect) {
      handleOnline = () => {
        processQueuedActions().finally(() => {
          refreshQueue();
        });
      };
      window.addEventListener('online', handleOnline);
    }

    return () => {
      window.removeEventListener(OFFLINE_QUEUE_UPDATED_EVENT, handleQueueUpdated);
      window.removeEventListener('storage', handleStorage);
      if (handleOnline) {
        window.removeEventListener('online', handleOnline);
      }
    };
  }, [autoProcessOnReconnect, refreshQueue]);

  const enqueue = useCallback(
    (action: string, data: unknown) => {
      const length = queueAction(action, data);
      refreshQueue();
      return length;
    },
    [refreshQueue],
  );

  const process = useCallback(async () => {
    const processed = await processQueuedActions();
    refreshQueue();
    return processed;
  }, [refreshQueue]);

  const hasPendingActions = queue.length > 0;
  const queueLength = queue.length;

  return useMemo(
    () => ({ queue, queueLength, hasPendingActions, enqueueAction: enqueue, processQueue: process }),
    [enqueue, hasPendingActions, process, queue, queueLength],
  );
}
