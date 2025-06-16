
import { useState, useRef, useEffect } from 'react';
import { qrScannerServiceNew, ScanResult } from '@/services/QRScannerService';
import { extractUSSDFromQR, validateUSSDFormat } from '@/utils/ussdHelper';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

export interface MobileQRScannerState {
  isScanning: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
  scannedResult: ScanResult | null;
  hasTorch: boolean;
  isTorchOn: boolean;
  showManualInput: boolean;
  isOptimizedForMobile: boolean;
  lightingCondition: string;
}

export const useMobileQRScanner = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { trackUserAction } = usePerformanceMonitoring('MobileQRScanner');
  
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

  const initialize = async () => {
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
  };

  const startScanning = async () => {
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
      trackUserAction('mobile_manual_input');
    }
  };

  const toggleTorch = async () => {
    if (state.hasTorch) {
      const newTorchState = await qrScannerServiceNew.toggleTorch();
      updateState({ isTorchOn: newTorchState });
      trackUserAction('mobile_torch_toggle', { enabled: newTorchState });
    }
  };

  const rescan = () => {
    updateState({ 
      scannedResult: null, 
      hasError: false, 
      showManualInput: false 
    });
    startScanning();
    trackUserAction('mobile_rescan');
  };

  const cleanup = () => {
    console.log('useMobileQRScanner: Cleaning up mobile scanner...');
    qrScannerServiceNew.stop();
    trackUserAction('mobile_scanner_cleanup');
  };

  const createTelURI = (ussdCode: string): string => {
    return qrScannerServiceNew.createTelURI(ussdCode);
  };

  const launchMoMo = async (ussdCode: string) => {
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
  };

  // Mobile-specific optimizations
  const optimizeForLowLight = async () => {
    if (state.hasTorch && !state.isTorchOn) {
      await toggleTorch();
    }
    trackUserAction('mobile_low_light_optimization');
  };

  const handleOrientationChange = () => {
    // Handle device orientation changes
    setTimeout(() => {
      if (state.isScanning) {
        rescan();
      }
    }, 500);
    trackUserAction('mobile_orientation_change');
  };

  useEffect(() => {
    // Listen for orientation changes on mobile
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [state.isScanning]);

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
    optimizeForLowLight,
    setShowManualInput: (show: boolean) => updateState({ showManualInput: show })
  };
};
