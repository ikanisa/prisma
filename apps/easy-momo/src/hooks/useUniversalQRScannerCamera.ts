
import { useRef } from 'react';
import { qrScannerServiceNew } from '@/services/QRScannerService';

export const useUniversalQRScannerCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const initialize = async (onSuccess: () => void, onError: (message: string) => void) => {
    if (!videoRef.current) {
      console.warn('useUniversalQRScannerCamera: Video element not ready');
      return;
    }

    console.log('useUniversalQRScannerCamera: Initializing camera...');

    try {
      const success = await qrScannerServiceNew.initialize(videoRef.current);
      if (success) {
        onSuccess();
        const hasTorch = await qrScannerServiceNew.hasTorch();
        return { hasTorch };
      } else {
        onError('Failed to initialize camera');
        return { hasTorch: false };
      }
    } catch (error) {
      console.error('useUniversalQRScannerCamera: Initialization failed:', error);
      onError('Camera initialization failed');
      return { hasTorch: false };
    }
  };

  const startScanning = async (onScanResult: (result: any) => void, onError: (message: string) => void) => {
    console.log('useUniversalQRScannerCamera: Starting scan...');
    
    const success = await qrScannerServiceNew.start(onScanResult);

    if (!success) {
      onError('Failed to start camera');
      return false;
    }

    return true;
  };

  const toggleTorch = async (hasTorch: boolean) => {
    if (hasTorch) {
      return await qrScannerServiceNew.toggleTorch();
    }
    return false;
  };

  const cleanup = () => {
    console.log('useUniversalQRScannerCamera: Cleaning up...');
    qrScannerServiceNew.stop();
  };

  return {
    videoRef,
    initialize,
    startScanning,
    toggleTorch,
    cleanup
  };
};
