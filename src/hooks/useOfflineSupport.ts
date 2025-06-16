
import { useState, useEffect } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { validateQRContent } from '@/utils/qrValidation';
import { addToOfflineQueue, getOfflineQueue, clearOfflineQueue } from '@/utils/offlineCache';

export const useOfflineSupport = () => {
  const { isOnline } = useNetworkStatus();
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  useEffect(() => {
    setOfflineQueue(getOfflineQueue());
  }, []);

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0 && !isProcessingQueue) {
      processOfflineQueue();
    }
  }, [isOnline, offlineQueue.length]);

  const processOfflineQueue = async () => {
    setIsProcessingQueue(true);
    
    try {
      const queue = getOfflineQueue();
      
      for (const action of queue) {
        try {
          // Process each queued action based on type
          switch (action.type) {
            case 'qr':
              console.log('Processing offline QR scan:', action.data);
              break;
            case 'scan':
              console.log('Processing offline scan:', action.data);
              break;
            case 'log':
              console.log('Processing offline analytics:', action.data);
              break;
          }
        } catch (error) {
          console.error('Failed to process offline action:', error);
        }
      }
      
      clearOfflineQueue();
      setOfflineQueue([]);
    } catch (error) {
      console.error('Error processing offline queue:', error);
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const validateQROffline = (qrCode: string) => {
    // Perform offline validation using local rules
    const validation = validateQRContent(qrCode);
    
    if (!isOnline && validation.isValid) {
      // Queue for later processing
      addToOfflineQueue({
        type: 'qr',
        data: {
          qrCode,
          validation,
          timestamp: Date.now()
        }
      });
    }
    
    return validation;
  };

  const getOfflineCapabilities = () => {
    return {
      canValidateQR: true,
      canShowHistory: true,
      canGenerateUSSD: true,
      canLogAnalytics: false,
      canSyncData: isOnline
    };
  };

  return {
    isOnline,
    offlineQueue,
    isProcessingQueue,
    validateQROffline,
    getOfflineCapabilities,
    queuedItemsCount: offlineQueue.length
  };
};
