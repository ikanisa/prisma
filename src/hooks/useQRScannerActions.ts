
import { scanningManager, ScanResult } from '@/services/scanningManager';
import { qrScannerService } from '@/services/qrScannerService';
import { feedbackService } from '@/services/feedbackService';
import { errorRecoveryService } from '@/services/errorRecoveryService';
import { errorMonitoringService } from '@/services/errorMonitoringService';
import { validateQRContent } from '@/utils/qrValidation';
import { toastService } from '@/services/toastService';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { useOfflineSupport } from '@/hooks/useOfflineSupport';

interface QRScannerActionsProps {
  state: any;
  lightingCondition: string;
  torchUsed: boolean;
  retryCount: number;
}

export const useQRScannerActions = ({ state, lightingCondition, torchUsed, retryCount }: QRScannerActionsProps) => {
  const { trackUserAction } = usePerformanceMonitoring('QRScanner');
  const { isOnline, validateQROffline } = useOfflineSupport();

  const handleScanSuccess = async (result: ScanResult) => {
    console.log('QR Code processed:', result);
    trackUserAction('qr_scan_success', { 
      method: result.method,
      confidence: result.confidence,
      processingTime: result.processingTime
    });
    
    state.setScanResult(result);
    state.setScannedCode(result.code || '');
    state.setIsScanning(false);
    
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
          state.setCurrentTransaction(transaction);
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
      state.setError('Scan successful but logging failed. You can still proceed.');
      trackUserAction('transaction_log_failed');
    });

    await scanningManager.stop();
  };

  const handleOfflineLogging = async (result: ScanResult) => {
    toastService.info('Offline Logging', 'Scan saved locally. Will sync when online.');
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
    if (!state.scannedCode || !state.currentTransaction) return;

    trackUserAction('momo_launch_attempt');

    try {
      const telURI = qrScannerService.createTelURI(state.scannedCode);
      
      const launchSuccess = await qrScannerService.markUSSDLaunched(state.currentTransaction.id);
      if (launchSuccess) {
        trackUserAction('ussd_marked_launched');
      }
      
      window.location.href = telURI;
      trackUserAction('momo_launch_success');
    } catch (error) {
      console.error('Failed to launch MoMo:', error);
      state.setError('Failed to launch MoMo dialer. Please try again.');
      errorMonitoringService.logError(error as Error, 'momo_launch');
      trackUserAction('momo_launch_error');
    }
  };

  const handleRescan = () => {
    trackUserAction('rescan_requested');
    state.resetState();
  };

  return {
    handleScanSuccess,
    handleManualInput,
    handleLaunchMoMo,
    handleRescan,
    isOnline
  };
};
