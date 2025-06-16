
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { useMobileScannerState } from './mobile-scanner/useMobileScannerState';
import { useMobileCameraControls } from './mobile-scanner/useMobileCameraControls';
import { useMobileScanHandling } from './mobile-scanner/useMobileScanHandling';
import { useMobileOrientationHandler } from './mobile-scanner/useMobileOrientationHandler';

export type { MobileQRScannerState } from './mobile-scanner/types';

export const useMobileQRScanner = () => {
  const { trackUserAction } = usePerformanceMonitoring('MobileQRScanner');
  const { state, updateState } = useMobileScannerState();
  
  const {
    videoRef,
    initialize,
    startScanning,
    handleManualInput,
    rescan,
    cleanup,
    launchMoMo
  } = useMobileScanHandling(state, updateState, trackUserAction);

  const { toggleTorch, optimizeForLowLight } = useMobileCameraControls(
    state, 
    updateState, 
    trackUserAction
  );

  // Handle orientation changes
  useMobileOrientationHandler(state.isScanning, rescan, trackUserAction);

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
