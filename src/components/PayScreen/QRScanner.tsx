import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { qrScannerService, ScanTransaction } from '@/services/qrScannerService';
import { feedbackService } from '@/services/feedbackService';
import EnhancedFlashlightButton from './EnhancedFlashlightButton';
import { EnhancedCameraService } from '@/services/EnhancedCameraService';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { errorMonitoringService } from '@/services/errorMonitoringService';

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
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
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

      const config = {
        fps: 10,
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      scannerRef.current = new Html5QrcodeScanner("qr-reader", config, false);
      
      scannerRef.current.render(
        (decodedText) => handleScanSuccess(decodedText),
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

  const handleScanSuccess = async (decodedText: string) => {
    console.log('QR Code scanned:', decodedText);
    trackUserAction('qr_scan_success', { codeLength: decodedText.length });
    
    setScannedCode(decodedText);
    setIsScanning(false);
    
    feedbackService.successFeedback();
    
    // Log to Supabase with retry and error handling
    try {
      const transaction = await qrScannerService.logScan(decodedText);
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
          // Don't block the main flow for lighting data failures
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

    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (error) {
        console.log('Error clearing scanner:', error);
      }
    }
  };

  const handleLaunchMoMo = async () => {
    if (!scannedCode || !currentTransaction) return;

    trackUserAction('momo_launch_attempt');

    try {
      const telURI = qrScannerService.createTelURI(scannedCode);
      
      // Mark USSD launched with retry
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
    setError(null);
    setIsScanning(true);
    setTorchUsed(false);
    setRetryCount(0);
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
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (error) {
        console.log('Error clearing scanner:', error);
      }
    }
    EnhancedCameraService.stopCamera();
  };

  const getLightingTips = () => {
    switch (lightingCondition) {
      case 'bright':
        return ['Move to shade if glare appears', 'Clean camera lens', 'Hold phone steady'];
      case 'dark':
        return ['Enable flashlight above', 'Move to better lighting', 'Hold phone steady'];
      case 'dim':
        return ['Try using flashlight', 'Find better lighting', 'Clean camera lens'];
      default:
        return ['Clean your camera lens', 'Hold phone steady', 'Ensure good lighting'];
    }
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
        
        <h1 className="text-white text-lg font-semibold">Scan QR Code</h1>
        
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
          <div className="w-full max-w-sm mx-auto">
            {/* Scanner Container with enhanced lighting-based styling */}
            <div className="relative">
              <div 
                id="qr-reader" 
                ref={scannerElementRef}
                className={`w-full rounded-2xl overflow-hidden shadow-2xl ${
                  lightingCondition === 'dark' ? 'ring-2 ring-yellow-400/50' :
                  lightingCondition === 'bright' ? 'ring-2 ring-blue-400/50' :
                  'ring-2 ring-blue-500/50'
                }`}
                style={{ 
                  filter: `drop-shadow(0 0 20px ${
                    lightingCondition === 'dark' ? 'rgba(250, 204, 21, 0.5)' : 
                    'rgba(59, 130, 246, 0.5)'
                  })` 
                }}
              />
              
              <video ref={videoRef} style={{ display: 'none' }} />
              
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-2xl">
                  <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p>Starting camera...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Instructions with lighting context */}
            <div className="mt-6 text-center">
              <p className="text-white text-lg mb-2">Scan a QR Code to Launch MoMo Payment</p>
              <p className="text-gray-300 text-sm">
                {lightingCondition === 'dark' && 'Low light detected - '}
                {lightingCondition === 'bright' && 'Bright light detected - '}
                Position the QR code within the frame
              </p>
              {retryCount > 0 && (
                <p className="text-yellow-300 text-xs mt-1">
                  Scanning attempt {retryCount + 1}/4
                </p>
              )}
            </div>

            {/* Adaptive Tips based on lighting */}
            <div className="mt-8 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-white text-sm font-medium mb-2">
                Scanning Tips {lightingCondition !== 'normal' && `(${lightingCondition} lighting)`}:
              </p>
              <ul className="text-gray-300 text-xs space-y-1">
                {getLightingTips().map((tip, index) => (
                  <li key={index}>• {tip}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm mx-auto text-center">
            <div className="bg-green-500/20 rounded-2xl p-6 mb-6 border border-green-500/30">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-white text-xl font-bold mb-2">QR Code Scanned!</h2>
              <p className="text-green-300 text-sm">Ready to launch MoMo payment</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 mb-6 backdrop-blur-sm">
              <p className="text-gray-300 text-sm mb-2">Scanned Code:</p>
              <p className="text-white font-mono text-sm break-all bg-black/30 p-2 rounded">
                {scannedCode}
              </p>
            </div>

            <button
              onClick={handleLaunchMoMo}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg shadow-lg"
              style={{ minHeight: '48px' }}
            >
              Launch MoMo Payment
            </button>

            {error && (
              <div className="mt-4 bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
