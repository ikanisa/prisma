
import { scanningManager } from '@/services/scanningManager';
import { EnhancedCameraService } from '@/services/EnhancedCameraService';
import { errorRecoveryService } from '@/services/errorRecoveryService';
import { errorMonitoringService } from '@/services/errorMonitoringService';
import { toastService } from '@/services/toastService';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

interface QRScannerInitProps {
  state: any;
  videoRef: React.RefObject<HTMLVideoElement>;
  onScanSuccess: (result: any) => void;
  retryCount: number;
}

export const useQRScannerInit = ({ state, videoRef, onScanSuccess, retryCount }: QRScannerInitProps) => {
  const { trackUserAction } = usePerformanceMonitoring('QRScanner');

  const initializeScanner = async () => {
    if (state.initializationInProgress) {
      console.log('useQRScanner: Initialization already in progress, skipping');
      return;
    }

    console.log('useQRScanner: Initializing scanner...');
    state.setInitializationInProgress(true);
    
    if (!state.scannerElementRef.current) {
      console.warn('Scanner element not ready, waiting...');
      setTimeout(() => {
        state.setInitializationInProgress(false);
        initializeScanner();
      }, 500);
      return;
    }

    await errorRecoveryService.withRetry(
      async () => {
        state.setIsLoading(true);
        state.setError(null);
        trackUserAction('scanner_initialize');

        console.log('Initializing scanning manager with element ID: qr-reader');
        await scanningManager.initializeScanner("qr-reader");
        
        console.log('Starting scanning process...');
        await scanningManager.startScanning(
          (result) => {
            console.log('Scan success callback triggered:', result);
            onScanSuccess(result);
          },
          (errorMessage) => {
            console.log('Scan error callback triggered:', errorMessage);
            if (!errorMessage.includes('No QR code found') && 
                !errorMessage.includes('NotFoundException')) {
              console.error('Significant QR scan error:', errorMessage);
              if (retryCount < 3) {
                state.setRetryCount(prev => prev + 1);
              }
            }
          }
        );

        setTimeout(async () => {
          try {
            console.log('Attempting enhanced camera initialization...');
            await EnhancedCameraService.initializeCameraWithEnhancements(videoRef);
            console.log('Enhanced camera initialized successfully');
            trackUserAction('enhanced_camera_success');
            
            const lighting = await EnhancedCameraService.detectLightingCondition();
            state.setLightingCondition(lighting.level);
            console.log('Lighting condition detected:', lighting.level);
          } catch (error) {
            console.log('Enhanced camera initialization failed:', error);
            errorMonitoringService.logError(error as Error, 'enhanced_camera_init');
            trackUserAction('enhanced_camera_fallback');
          }
        }, 2000);

        setTimeout(() => {
          console.log('Scanner loading timeout completed');
          state.setIsLoading(false);
          state.setScannerReady(true);
          state.setInitializationInProgress(false);
          trackUserAction('scanner_ready');
        }, 3000);
      },
      'scanner_initialization',
      {
        maxRetries: 2,
        retryDelay: 1000,
        fallbackActions: [
          () => handleCameraFallback(),
          () => showManualInputOption()
        ]
      }
    ).catch((err) => {
      console.error('Scanner initialization failed after retries:', err);
      state.setCurrentError(err);
      state.setShowErrorModal(true);
      state.setIsLoading(false);
      state.setInitializationInProgress(false);
      trackUserAction('scanner_init_error');
    });
  };

  const handleCameraFallback = async () => {
    toastService.info('Camera Fallback', 'Trying alternative camera access...');
  };

  const showManualInputOption = async () => {
    toastService.info('Manual Input Available', 'Camera not available - manual input option enabled');
    state.setShowManualInput(true);
  };

  const handleScannerReady = () => {
    console.log('Scanner element is ready, initializing...');
    if (!state.scannerReady && !state.initializationInProgress) {
      state.setScannerReady(true);
      initializeScanner();
    }
  };

  const cleanup = () => {
    trackUserAction('scanner_cleanup');
    scanningManager.stop();
    EnhancedCameraService.stopCamera();
    state.setInitializationInProgress(false);
  };

  return {
    initializeScanner,
    handleScannerReady,
    cleanup
  };
};
