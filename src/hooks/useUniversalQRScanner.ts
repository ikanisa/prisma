
import { useState, useRef, useEffect } from 'react';
import { qrScannerServiceNew, ScanResult } from '@/services/QRScannerService';
import { validateUniversalUssd, extractUssdFromQR, UssdValidationResult } from '@/utils/universalUssdHelper';

export interface UniversalQRScannerState {
  isScanning: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
  scannedResult: ScanResult | null;
  ussdValidation: UssdValidationResult | null;
  hasTorch: boolean;
  isTorchOn: boolean;
  showManualInput: boolean;
}

export const useUniversalQRScanner = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<UniversalQRScannerState>({
    isScanning: false,
    isLoading: true,
    hasError: false,
    errorMessage: '',
    scannedResult: null,
    ussdValidation: null,
    hasTorch: false,
    isTorchOn: false,
    showManualInput: false
  });

  const updateState = (updates: Partial<UniversalQRScannerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const initialize = async () => {
    if (!videoRef.current) {
      console.warn('useUniversalQRScanner: Video element not ready');
      return;
    }

    console.log('useUniversalQRScanner: Initializing universal scanner...');
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
      console.error('useUniversalQRScanner: Initialization failed:', error);
      updateState({ 
        hasError: true, 
        errorMessage: 'Camera initialization failed',
        isLoading: false 
      });
    }
  };

  const startScanning = async () => {
    console.log('useUniversalQRScanner: Starting scan...');
    
    const success = await qrScannerServiceNew.start((result: ScanResult) => {
      console.log('useUniversalQRScanner: Scan result received:', result);
      
      // Extract and validate USSD
      const extractedUssd = extractUssdFromQR(result.code);
      const validation = validateUniversalUssd(extractedUssd || result.code);
      
      // Enhanced result with validation
      const enhancedResult: ScanResult = {
        ...result,
        ussdCode: validation.sanitized,
        confidence: validation.isValid ? result.confidence : 0.3
      };
      
      updateState({ 
        scannedResult: enhancedResult,
        ussdValidation: validation,
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
    const extractedUssd = extractUssdFromQR(code);
    const validation = validateUniversalUssd(extractedUssd || code);
    
    if (validation.isValid || code.length > 5) {
      const result: ScanResult = {
        success: true,
        code,
        ussdCode: validation.sanitized,
        confidence: validation.isValid ? 0.8 : 0.5,
        timestamp: Date.now()
      };
      
      updateState({ 
        scannedResult: result,
        ussdValidation: validation,
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
      ussdValidation: null,
      hasError: false, 
      showManualInput: false 
    });
    startScanning();
  };

  const cleanup = () => {
    console.log('useUniversalQRScanner: Cleaning up...');
    qrScannerServiceNew.stop();
  };

  const launchUssd = async (ussdCode: string) => {
    try {
      const telURI = `tel:${encodeURIComponent(ussdCode)}`;
      
      // Log the scan with country/provider info
      if (state.scannedResult && state.ussdValidation) {
        await qrScannerServiceNew.logScan(state.scannedResult.code);
      }
      
      window.location.href = telURI;
      console.log('useUniversalQRScanner: Launched USSD with:', telURI);
    } catch (error) {
      console.error('useUniversalQRScanner: Failed to launch USSD:', error);
      updateState({ 
        hasError: true, 
        errorMessage: 'Failed to launch dialer' 
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
    launchUssd,
    setShowManualInput: (show: boolean) => updateState({ showManualInput: show })
  };
};
