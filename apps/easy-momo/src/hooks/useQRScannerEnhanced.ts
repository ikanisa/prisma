
import { scanningManager, ScanResult } from '@/services/scanningManager';
import { validateQRContent } from '@/utils/qrValidation';
import { errorMonitoringService } from '@/services/errorMonitoringService';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

interface QRScannerEnhancedProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onScanSuccess: (result: ScanResult) => void;
  setState: any;
}

export const useQRScannerEnhanced = ({ videoRef, onScanSuccess, setState }: QRScannerEnhancedProps) => {
  const { trackUserAction } = usePerformanceMonitoring('QRScanner');

  const handleEnhancedScan = async () => {
    if (!videoRef.current) {
      console.warn('No video element available for enhanced scan');
      setState.setError('Video not available for enhanced scanning');
      return;
    }
    
    setState.setIsEnhancedMode(true);
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
          
          await onScanSuccess(scanResult);
          trackUserAction('enhanced_scan_success');
        } else {
          console.log('Enhanced scan failed to detect QR code:', result);
          setState.setError('Enhanced scanning could not detect a valid QR code.');
          trackUserAction('enhanced_scan_failed');
        }
      } else {
        console.error('Failed to capture frame for enhanced scan');
        setState.setError('Could not capture camera frame for enhanced scanning.');
      }
    } catch (error) {
      console.error('Enhanced scanning error:', error);
      setState.setError('Enhanced scanning failed. Try manual input.');
      errorMonitoringService.logError(error as Error, 'enhanced_scan');
      trackUserAction('enhanced_scan_error');
    } finally {
      setState.setIsEnhancedMode(false);
    }
  };

  const handleTorchToggle = (enabled: boolean) => {
    setState.setTorchUsed(enabled);
    trackUserAction('torch_toggle', { enabled });
  };

  const handleLightingChange = (condition: string) => {
    setState.setLightingCondition(condition);
    trackUserAction('lighting_change', { condition });
  };

  return {
    handleEnhancedScan,
    handleTorchToggle,
    handleLightingChange
  };
};
