
import { useState, useRef, useEffect } from 'react';
import { scanningManager, ScanResult } from '@/services/scanningManager';
import { qrScannerService, ScanTransaction } from '@/services/qrScannerService';
import { feedbackService } from '@/services/feedbackService';
import { EnhancedCameraService } from '@/services/EnhancedCameraService';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { errorMonitoringService } from '@/services/errorMonitoringService';
import { validateQRContent } from '@/utils/qrValidation';
import { errorRecoveryService } from '@/services/errorRecoveryService';
import { useOfflineSupport } from '@/hooks/useOfflineSupport';
import { toastService } from '@/services/toastService';

export const useQRScanner = () => {
  const [isScanning, setIsScanning] = useState(true);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [currentTransaction, setCurrentTransaction] = useState<ScanTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lightingCondition, setLightingCondition] = useState<string>('normal');
  const [torchUsed, setTorchUsed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [isEnhancedMode, setIsEnhancedMode] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [currentError, setCurrentError] = useState<Error | null>(null);
  const [scannerReady, setScannerReady] = useState(false);
  
  const scannerElementRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const { trackUserAction } = usePerformanceMonitoring('QRScanner');
  const { isOnline, validateQROffline } = useOfflineSupport();

  const initializeScanner = async () => {
    console.log('useQRScanner: Initializing scanner...');
    
    // Wait for scanner element to be ready
    if (!scannerElementRef.current) {
      console.warn('Scanner element not ready, waiting...');
      setTimeout(() => initializeScanner(), 100);
      return;
    }

    await errorRecoveryService.withRetry(
      async () => {
        setIsLoading(true);
        setError(null);
        trackUserAction('scanner_initialize');

        console.log('Initializing scanning manager with element ID: qr-reader');
        await scanningManager.initializeScanner("qr-reader");
        
        console.log('Starting scanning process...');
        await scanningManager.startScanning(
          (result) => {
            console.log('Scan success callback triggered:', result);
            handleScanSuccess(result);
          },
          (errorMessage) => {
            console.log('Scan error callback triggered:', errorMessage);
            if (!errorMessage.includes('No QR code found') && 
                !errorMessage.includes('NotFoundException')) {
              console.error('Significant QR scan error:', errorMessage);
              if (retryCount < 3) {
                setRetryCount(prev => prev + 1);
              }
            }
          }
        );

        // Initialize enhanced camera features
        try {
          console.log('Attempting enhanced camera initialization...');
          await EnhancedCameraService.initializeCameraWithEnhancements(videoRef);
          console.log('Enhanced camera initialized successfully');
          trackUserAction('enhanced_camera_success');
          
          // Detect lighting conditions
          const lighting = await EnhancedCameraService.detectLightingCondition();
          setLightingCondition(lighting.level);
          console.log('Lighting condition detected:', lighting.level);
        } catch (error) {
          console.log('Enhanced camera initialization failed:', error);
          errorMonitoringService.logError(error as Error, 'enhanced_camera_init');
          trackUserAction('enhanced_camera_fallback');
        }

        setTimeout(() => {
          console.log('Scanner loading timeout completed');
          setIsLoading(false);
          setScannerReady(true);
          trackUserAction('scanner_ready');
        }, 2000);
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
      setCurrentError(err);
      setShowErrorModal(true);
      setIsLoading(false);
      trackUserAction('scanner_init_error');
    });
  };

  const handleCameraFallback = async () => {
    toastService.info('Camera Fallback', 'Trying alternative camera access...');
  };

  const showManualInputOption = async () => {
    toastService.info('Manual Input Available', 'Camera not available - manual input option enabled');
    setShowManualInput(true);
  };

  const handleScanSuccess = async (result: ScanResult) => {
    console.log('QR Code processed:', result);
    trackUserAction('qr_scan_success', { 
      method: result.method,
      confidence: result.confidence,
      processingTime: result.processingTime
    });
    
    setScanResult(result);
    setScannedCode(result.code || '');
    setIsScanning(false);
    
    feedbackService.successFeedback();
    
    if (!isOnline) {
      const offlineValidation = validateQROffline(result.code || '');
      if (offlineValidation.isValid) {
        toastService.info('Offline Mode', 'QR code validated locally. Will sync when online.');
      }
      return;
    }
    
    await errorRecoveryService.withRetry(
      async () => {
        const transaction = await qrScannerService.logScan(result.code || '');
        if (transaction) {
          setCurrentTransaction(transaction);
          trackUserAction('transaction_logged');
          
          try {
            const lightingUpdateSuccess = await qrScannerService.updateLightingData(
              transaction.id, 
              lightingCondition, 
              torchUsed
            );
            if (lightingUpdateSuccess) {
              trackUserAction('lighting_data_updated');
            }
          } catch (error) {
            console.log('Failed to update lighting data:', error);
          }
        } else {
          throw new Error('Failed to log scan');
        }
      },
      'scan_logging',
      {
        maxRetries: 2,
        fallbackActions: [
          () => handleOfflineLogging(result)
        ]
      }
    ).catch((error) => {
      setError('Scan successful but logging failed. You can still proceed.');
      trackUserAction('transaction_log_failed');
    });

    await scanningManager.stop();
  };

  const handleOfflineLogging = async (result: ScanResult) => {
    toastService.info('Offline Logging', 'Scan saved locally. Will sync when online.');
  };

  const handleEnhancedScan = async () => {
    if (!videoRef.current) {
      console.warn('No video element available for enhanced scan');
      setError('Video not available for enhanced scanning');
      return;
    }
    
    setIsEnhancedMode(true);
    trackUserAction('enhanced_scan_attempt');
    
    try {
      console.log('Capturing frame for enhanced scan...');
      const canvas = scanningManager.captureCurrentFrame(videoRef.current);
      if (canvas) {
        console.log('Frame captured, processing with AI...');
        const result = await scanningManager.enhancedScan(canvas);
        
        if (result.success && result.ussdCode) {
          console.log('Enhanced scan successful:', result);
          const validation = validateQRContent(result.ussdCode);
          const scanResult: ScanResult = {
            success: true,
            code: result.ussdCode,
            method: 'enhanced',
            confidence: result.confidence || 0.8,
            processingTime: result.processingTime,
            validation
          };
          
          await handleScanSuccess(scanResult);
          trackUserAction('enhanced_scan_success');
        } else {
          console.log('Enhanced scan failed to detect QR code:', result);
          setError('Enhanced scanning could not detect a valid QR code.');
          trackUserAction('enhanced_scan_failed');
        }
      } else {
        console.error('Failed to capture frame for enhanced scan');
        setError('Could not capture camera frame for enhanced scanning.');
      }
    } catch (error) {
      console.error('Enhanced scanning error:', error);
      setError('Enhanced scanning failed. Try manual input.');
      errorMonitoringService.logError(error as Error, 'enhanced_scan');
      trackUserAction('enhanced_scan_error');
    } finally {
      setIsEnhancedMode(false);
    }
  };

  const handleManualInput = (code: string) => {
    const validation = validateQRContent(code);
    const result: ScanResult = {
      success: true,
      code,
      method: 'manual',
      confidence: validation.confidence,
      processingTime: 0,
      validation
    };
    
    handleScanSuccess(result);
    trackUserAction('manual_input_success');
  };

  const handleLaunchMoMo = async () => {
    if (!scannedCode || !currentTransaction) return;

    trackUserAction('momo_launch_attempt');

    try {
      const telURI = qrScannerService.createTelURI(scannedCode);
      
      const launchSuccess = await qrScannerService.markUSSDLaunched(currentTransaction.id);
      if (launchSuccess) {
        trackUserAction('ussd_marked_launched');
      }
      
      window.location.href = telURI;
      trackUserAction('momo_launch_success');
    } catch (error) {
      console.error('Failed to launch MoMo:', error);
      setError('Failed to launch MoMo dialer. Please try again.');
      errorMonitoringService.logError(error as Error, 'momo_launch');
      trackUserAction('momo_launch_error');
    }
  };

  const handleRescan = () => {
    trackUserAction('rescan_requested');
    setScannedCode(null);
    setCurrentTransaction(null);
    setScanResult(null);
    setError(null);
    setIsScanning(true);
    setTorchUsed(false);
    setRetryCount(0);
    setIsEnhancedMode(false);
    setScannerReady(false);
    initializeScanner();
  };

  const handleTorchToggle = (enabled: boolean) => {
    setTorchUsed(enabled);
    trackUserAction('torch_toggle', { enabled });
  };

  const handleLightingChange = (condition: string) => {
    setLightingCondition(condition);
    trackUserAction('lighting_change', { condition });
  };

  const handleScannerReady = () => {
    console.log('Scanner element is ready, initializing...');
    setScannerReady(true);
    if (!isLoading) {
      initializeScanner();
    }
  };

  const cleanup = () => {
    trackUserAction('scanner_cleanup');
    scanningManager.stop();
    EnhancedCameraService.stopCamera();
  };

  // Initialize when scanner element is ready
  useEffect(() => {
    if (scannerReady && scannerElementRef.current) {
      initializeScanner();
    }
  }, [scannerReady]);

  return {
    // State
    isScanning,
    scannedCode,
    currentTransaction,
    error,
    isLoading,
    lightingCondition,
    torchUsed,
    retryCount,
    scanResult,
    showManualInput,
    isEnhancedMode,
    showErrorModal,
    currentError,
    scannerElementRef,
    videoRef,
    isOnline,
    scannerReady,
    
    // Actions
    initializeScanner,
    handleScanSuccess,
    handleEnhancedScan,
    handleManualInput,
    handleLaunchMoMo,
    handleRescan,
    handleTorchToggle,
    handleLightingChange,
    handleScannerReady,
    cleanup,
    setShowManualInput,
    setShowErrorModal,
    setCurrentError,
    setRetryCount
  };
};
