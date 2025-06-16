
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { qrScannerService, ScanTransaction } from '@/services/qrScannerService';
import { feedbackService } from '@/services/feedbackService';
import EnhancedFlashlightButton from './EnhancedFlashlightButton';
import { EnhancedCameraService } from '@/services/EnhancedCameraService';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { errorMonitoringService } from '@/services/errorMonitoringService';
import { scanningManager, ScanResult } from '@/services/scanningManager';
import AIManualQRInput from './AIManualQRInput';
import { validateQRContent } from '@/utils/qrValidation';
import QRScannerControls from './QRScannerControls';
import QRScannerResult from './QRScannerResult';
import QRScannerView from './QRScannerView';

interface QRScannerProps {
  onBack: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onBack }) => {
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
  
  const scannerElementRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const { trackUserAction } = usePerformanceMonitoring('QRScanner');

  useEffect(() => {
    initializeScanner();
    return () => {
      cleanup();
    };
  }, []);

  const initializeScanner = async () => {
    if (!scannerElementRef.current) return;

    setIsLoading(true);
    setError(null);
    trackUserAction('scanner_initialize');

    try {
      // Initialize enhanced camera with error handling
      try {
        await EnhancedCameraService.initializeCameraWithEnhancements(videoRef);
        trackUserAction('enhanced_camera_success');
      } catch (error) {
        console.log('Enhanced camera initialization failed, falling back to standard:', error);
        errorMonitoringService.logError(error as Error, 'enhanced_camera_init');
        trackUserAction('enhanced_camera_fallback');
      }

      // Initialize scanning manager
      await scanningManager.initializeScanner("qr-reader");
      
      await scanningManager.startScanning(
        (result) => handleScanSuccess(result),
        (errorMessage) => {
          if (!errorMessage.includes('No QR code found')) {
            console.log('QR scan error:', errorMessage);
            if (retryCount < 3) {
              setRetryCount(prev => prev + 1);
            }
          }
        }
      );

      setTimeout(() => {
        setIsLoading(false);
        trackUserAction('scanner_ready');
      }, 2000);

    } catch (error) {
      setIsLoading(false);
      setError('Failed to initialize camera. Please check permissions.');
      errorMonitoringService.logError(error as Error, 'scanner_initialization');
      trackUserAction('scanner_init_error');
    }
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
    
    // Log to Supabase with retry and error handling
    try {
      const transaction = await qrScannerService.logScan(result.code || '');
      if (transaction) {
        setCurrentTransaction(transaction);
        trackUserAction('transaction_logged');
        
        // Update with lighting data (non-blocking)
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
        setError('Failed to log scan. You can still proceed with payment.');
        trackUserAction('transaction_log_failed');
      }
    } catch (error) {
      console.error('Error during scan processing:', error);
      setError('Scan successful but logging failed. You can still proceed.');
      errorMonitoringService.logError(error as Error, 'scan_processing');
    }

    await scanningManager.stop();
  };

  const handleEnhancedScan = async () => {
    if (!videoRef.current) return;
    
    setIsEnhancedMode(true);
    trackUserAction('enhanced_scan_attempt');
    
    try {
      const canvas = scanningManager.captureCurrentFrame(videoRef.current);
      if (canvas) {
        const result = await scanningManager.enhancedScan(canvas);
        
        if (result.success && result.ussdCode) {
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
          setError('Enhanced scanning could not detect a valid QR code.');
          trackUserAction('enhanced_scan_failed');
        }
      }
    } catch (error) {
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

  const cleanup = () => {
    trackUserAction('scanner_cleanup');
    scanningManager.stop();
    EnhancedCameraService.stopCamera();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <h1 className="text-white text-lg font-semibold">
          {scanResult?.method === 'ai' && '🤖 AI-Enhanced '}
          {scanResult?.method === 'enhanced' && '⚡ Enhanced '}
          Scan QR Code
        </h1>
        
        {!isScanning && (
          <button
            onClick={handleRescan}
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Rescan"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
        )}
        {isScanning && <div className="w-10 h-10" />}
      </div>

      {/* Scanner Controls */}
      <QRScannerControls
        isScanning={isScanning}
        isEnhancedMode={isEnhancedMode}
        onEnhancedScan={handleEnhancedScan}
        onShowManualInput={() => setShowManualInput(true)}
      />

      {/* Enhanced Flashlight Button */}
      {isScanning && (
        <EnhancedFlashlightButton
          videoRef={videoRef}
          onTorchToggle={handleTorchToggle}
          onLightingChange={handleLightingChange}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {isScanning ? (
          <QRScannerView
            isLoading={isLoading}
            lightingCondition={lightingCondition}
            retryCount={retryCount}
            scannerElementRef={scannerElementRef}
            videoRef={videoRef}
          />
        ) : (
          <QRScannerResult
            scannedCode={scannedCode!}
            scanResult={scanResult}
            error={error}
            onLaunchMoMo={handleLaunchMoMo}
          />
        )}
      </div>

      {/* Manual Input Modal */}
      {showManualInput && (
        <AIManualQRInput
          onClose={() => setShowManualInput(false)}
          onCodeSubmit={handleManualInput}
          lastScannedImage={scanningManager.getLastCapturedFrame()}
        />
      )}
    </div>
  );
};

export default QRScanner;
