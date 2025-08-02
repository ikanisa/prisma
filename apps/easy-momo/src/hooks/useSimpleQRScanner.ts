
import { useState, useRef, useEffect } from 'react';
import { qrScannerServiceNew, ScanResult } from '@/services/QRScannerService';
import { extractUSSDFromQR, validateUSSDFormat } from '@/utils/ussdHelper';

export interface SimpleQRScannerState {
  isScanning: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
  scannedResult: ScanResult | null;
  hasTorch: boolean;
  isTorchOn: boolean;
  showManualInput: boolean;
}

export const useSimpleQRScanner = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<SimpleQRScannerState>({
    isScanning: false,
    isLoading: true,
    hasError: false,
    errorMessage: '',
    scannedResult: null,
    hasTorch: false,
    isTorchOn: false,
    showManualInput: false
  });

  const updateState = (updates: Partial<SimpleQRScannerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const initialize = async () => {
    if (!videoRef.current) {
      console.warn('useSimpleQRScanner: Video element not ready');
      return;
    }

    console.log('useSimpleQRScanner: Initializing scanner...');
    updateState({ isLoading: true, hasError: false });

    try {
      const success = await qrScannerServiceNew.initialize(videoRef.current);
      if (success) {
        await startScanning();
        const hasTorch = await qrScannerServiceNew.hasTorch();
        updateState({ hasTorch, isLoading: false });
      } else {
        updateState({ 
          hasError: true, 
          errorMessage: 'Failed to initialize camera',
          isLoading: false 
        });
      }
    } catch (error) {
      console.error('useSimpleQRScanner: Initialization failed:', error);
      updateState({ 
        hasError: true, 
        errorMessage: 'Camera initialization failed',
        isLoading: false 
      });
    }
  };

  const startScanning = async () => {
    console.log('useSimpleQRScanner: Starting scan...');
    
    const success = await qrScannerServiceNew.start((result: ScanResult) => {
      console.log('useSimpleQRScanner: Scan result received:', result);
      updateState({ 
        scannedResult: result, 
        isScanning: false 
      });
    });

    if (success) {
      updateState({ isScanning: true, hasError: false });
    } else {
      updateState({ 
        hasError: true, 
        errorMessage: 'Failed to start camera',
        showManualInput: true 
      });
    }
  };

  const handleManualInput = (code: string) => {
    const ussdCode = extractUSSDFromQR(code);
    const isValid = validateUSSDFormat(ussdCode || code);
    
    if (isValid || code.length > 5) {
      const result: ScanResult = {
        success: true,
        code,
        ussdCode: ussdCode || code,
        confidence: 0.8,
        timestamp: Date.now()
      };
      
      updateState({ 
        scannedResult: result, 
        isScanning: false,
        showManualInput: false 
      });
    }
  };

  const toggleTorch = async () => {
    if (state.hasTorch) {
      const newTorchState = await qrScannerServiceNew.toggleTorch();
      updateState({ isTorchOn: newTorchState });
    }
  };

  const rescan = () => {
    updateState({ 
      scannedResult: null, 
      hasError: false, 
      showManualInput: false 
    });
    startScanning();
  };

  const cleanup = () => {
    console.log('useSimpleQRScanner: Cleaning up...');
    qrScannerServiceNew.stop();
  };

  const createTelURI = (ussdCode: string): string => {
    return `tel:${encodeURIComponent(ussdCode)}`;
  };

  const launchMoMo = (ussdCode: string) => {
    try {
      const telURI = createTelURI(ussdCode);
      window.location.href = telURI;
      console.log('useSimpleQRScanner: Launched MoMo with:', telURI);
    } catch (error) {
      console.error('useSimpleQRScanner: Failed to launch MoMo:', error);
      updateState({ 
        hasError: true, 
        errorMessage: 'Failed to launch MoMo dialer' 
      });
    }
  };

  return {
    // State
    ...state,
    videoRef,
    
    // Actions
    initialize,
    startScanning,
    handleManualInput,
    toggleTorch,
    rescan,
    cleanup,
    launchMoMo,
    setShowManualInput: (show: boolean) => updateState({ showManualInput: show })
  };
};
