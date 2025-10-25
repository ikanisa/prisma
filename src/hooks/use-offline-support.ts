import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getOfflineQueueSnapshot,
  OFFLINE_QUEUE_UPDATED_EVENT,
  processQueuedActions,
  queueAction,
  resetOfflineQueue,
  type QueuedOfflineAction,
} from '@/utils/pwa';

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
  const [queue, setQueue] = useState<QueuedOfflineAction[]>([]);

  const refreshQueue = useCallback(async () => {
    if (typeof window === 'undefined') {
      setQueue([]);
      return;
    }

    try {
      const snapshot = await getOfflineQueueSnapshot();
      setQueue(snapshot);
    } catch {
      setQueue([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    void refreshQueue();

    const handleQueueUpdated: EventListener = () => {
      void refreshQueue();
    };

    window.addEventListener(OFFLINE_QUEUE_UPDATED_EVENT, handleQueueUpdated);

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
      if (handleOnline) {
        window.removeEventListener('online', handleOnline);
      }
    };
  }, [autoProcessOnReconnect, refreshQueue]);

  const enqueue = useCallback(
    async (action: string, data: unknown) => {
      const length = await queueAction(action, data);
      await refreshQueue();
      return length;
    },
    [refreshQueue],
  );

  const process = useCallback(async () => {
    const processed = await processQueuedActions();
    refreshQueue();
    return processed;
  }, [refreshQueue]);

  const resetQueue = useCallback(async () => {
    await resetOfflineQueue();
    await refreshQueue();
  }, [refreshQueue]);

  const hasPendingActions = queue.length > 0;
  const queueLength = queue.length;

  return useMemo(
    () => ({ queue, queueLength, hasPendingActions, enqueueAction: enqueue, processQueue: process, resetQueue }),
    [enqueue, hasPendingActions, process, queue, queueLength, resetQueue],
  );
}
