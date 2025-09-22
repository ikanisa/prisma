
import { useState } from 'react';
import { ScanResult } from '@/services/QRScannerService';
import { AIValidationResult } from '@/services/aiUssdValidationService';
import { Transaction } from '@/services/transactionService';

export interface UniversalQRScannerState {
  isScanning: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
  scannedResult: ScanResult | null;
  ussdValidation: AIValidationResult | null;
  hasTorch: boolean;
  isTorchOn: boolean;
  showManualInput: boolean;
  currentTransaction: Transaction | null;
}

export const useUniversalQRScannerState = () => {
  const [state, setState] = useState<UniversalQRScannerState>({
    isScanning: false,
    isLoading: true,
    hasError: false,
    errorMessage: '',
    scannedResult: null,
    ussdValidation: null,
    hasTorch: false,
    isTorchOn: false,
    showManualInput: false,
    currentTransaction: null
  });

  const updateState = (updates: Partial<UniversalQRScannerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const resetScanState = () => {
    updateState({ 
      scannedResult: null,
      ussdValidation: null,
      hasError: false, 
      showManualInput: false,
      currentTransaction: null
    });
  };

  return {
    state,
    updateState,
    resetScanState
  };
};
