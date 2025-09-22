
import { useState } from 'react';
import { MobileQRScannerState } from './types';

export const useMobileScannerState = () => {
  const [state, setState] = useState<MobileQRScannerState>({
    isScanning: false,
    isLoading: true,
    hasError: false,
    errorMessage: '',
    scannedResult: null,
    hasTorch: false,
    isTorchOn: false,
    showManualInput: false,
    isOptimizedForMobile: false,
    lightingCondition: 'unknown'
  });

  const updateState = (updates: Partial<MobileQRScannerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  return { state, updateState };
};
