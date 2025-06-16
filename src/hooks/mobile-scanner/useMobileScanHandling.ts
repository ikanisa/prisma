
import { useRef, useCallback } from 'react';
import { qrScannerServiceNew, ScanResult } from '@/services/QRScannerService';
import { extractUSSDFromQR, validateUSSDFormat } from '@/utils/ussdHelper';
import { MobileQRScannerState } from './types';

export const useMobileScanHandling = (
  state: MobileQRScannerState,
  updateState: (updates: Partial<MobileQRScannerState>) => void,
  trackUserAction: (action: string, data?: Record<string, any>) => void
) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const initialize = useCallback(async () => {
    if (!videoRef.current) {
      console.warn('useMobileQRScanner: Video element not ready');
      return;
    }

    console.log('useMobileQRScanner: Initializing mobile-optimized scanner...');
    updateState({ isLoading: true, hasError: false });

    try {
      const success = await qrScannerServiceNew.initialize(videoRef.current);
      if (success) {
        // Apply mobile optimizations
        await qrScannerServiceNew.optimizeForMobile();
        updateState({ isOptimizedForMobile: true });
        
        // Detect lighting conditions
        const lightingCondition = await qrScannerServiceNew.detectLightingCondition();
        updateState({ lightingCondition });
        
        await startScanning();
        const hasTorch = await qrScannerServiceNew.hasTorch();
        updateState({ hasTorch, isLoading: false });
        
        trackUserAction('mobile_scanner_initialized');
      } else {
        updateState({ 
          hasError: true, 
          errorMessage: 'Failed to initialize mobile camera',
          isLoading: false 
        });
        trackUserAction('mobile_scanner_init_failed');
      }
    } catch (error) {
      console.error('useMobileQRScanner: Initialization failed:', error);
      updateState({ 
        hasError: true, 
        errorMessage: 'Mobile camera initialization failed',
        isLoading: false 
      });
      trackUserAction('mobile_scanner_error');
    }
  }, [updateState, trackUserAction]);

  const startScanning = useCallback(async () => {
    console.log('useMobileQRScanner: Starting mobile scan...');
    
    const success = await qrScannerServiceNew.start((result: ScanResult) => {
      console.log('useMobileQRScanner: Mobile scan result received:', result);
      updateState({ 
        scannedResult: result, 
        isScanning: false 
      });
      trackUserAction('mobile_scan_success', {
        confidence: result.confidence,
        ussdDetected: !!result.ussdCode
      });
    });

    if (success) {
      updateState({ isScanning: true, hasError: false });
      trackUserAction('mobile_scan_started');
    } else {
      updateState({ 
        hasError: true, 
        errorMessage: 'Failed to start mobile camera',
        showManualInput: true 
      });
      trackUserAction('mobile_scan_start_failed');
    }
  }, [updateState, trackUserAction]);

  const handleManualInput = useCallback((code: string) => {
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
      trackUserAction('mobile_manual_input');
    }
  }, [updateState, trackUserAction]);

  const rescan = useCallback(() => {
    updateState({ 
      scannedResult: null, 
      hasError: false, 
      showManualInput: false 
    });
    startScanning();
    trackUserAction('mobile_rescan');
  }, [updateState, startScanning, trackUserAction]);

  const cleanup = useCallback(() => {
    console.log('useMobileQRScanner: Cleaning up mobile scanner...');
    qrScannerServiceNew.stop();
    trackUserAction('mobile_scanner_cleanup');
  }, [trackUserAction]);

  const createTelURI = useCallback((ussdCode: string): string => {
    return qrScannerServiceNew.createTelURI(ussdCode);
  }, []);

  const launchMoMo = useCallback(async (ussdCode: string) => {
    try {
      const telURI = createTelURI(ussdCode);
      
      // Log the scan if we have a result
      if (state.scannedResult) {
        await qrScannerServiceNew.logScan(state.scannedResult.code);
      }
      
      window.location.href = telURI;
      console.log('useMobileQRScanner: Launched MoMo with:', telURI);
      trackUserAction('mobile_momo_launch');
    } catch (error) {
      console.error('useMobileQRScanner: Failed to launch MoMo:', error);
      updateState({ 
        hasError: true, 
        errorMessage: 'Failed to launch MoMo dialer' 
      });
      trackUserAction('mobile_momo_launch_failed');
    }
  }, [state.scannedResult, createTelURI, updateState, trackUserAction]);

  return {
    videoRef,
    initialize,
    startScanning,
    handleManualInput,
    rescan,
    cleanup,
    launchMoMo
  };
};
