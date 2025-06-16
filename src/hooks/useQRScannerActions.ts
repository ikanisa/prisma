import { scanningManager, ScanResult } from '@/services/scanningManager';
import { qrScannerServiceNew } from '@/services/QRScannerService';
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
      processingTime: result.processingTime,
      continuousMode: state.continuousMode
    });
    
    feedbackService.successFeedback();
    
    if (!isOnline) {
      const offlineValidation = validateQROffline(result.code || '');
      if (offlineValidation.isValid) {
        toastService.info('Offline Mode', 'QR code validated locally. Will sync when online.');
      }
    }
    
    // Log the scan without stopping the scanner
    let transaction = null;
    if (isOnline) {
      try {
        transaction = await qrScannerServiceNew.logScan(result.code || '');
        if (transaction) {
          state.setCurrentTransaction(transaction);
          trackUserAction('transaction_logged');
          
          // Update lighting data in background
          qrScannerServiceNew.updateLightingData(
            transaction.id, 
            lightingCondition, 
            torchUsed
          ).catch(error => {
            console.log('Failed to update lighting data:', error);
          });
        }
      } catch (error) {
        console.log('Failed to log scan:', error);
        trackUserAction('transaction_log_failed');
      }
    }

    // Add to scan history without stopping scanner
    state.addScannedCode(result.code || '', result, transaction);
    
    // Show brief success feedback but keep scanning
    toastService.success('QR Scanned!', 'Code captured successfully. Continue scanning or launch payment.');
    
    // Don't stop scanning in continuous mode
    if (!state.continuousMode) {
      state.setIsScanning(false);
      await scanningManager.stop();
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
    state.setShowManualInput(false);
  };

  const handleLaunchMoMo = async (scanData?: any) => {
    const targetScan = scanData || state.getLatestScan();
    if (!targetScan?.code) return;

    trackUserAction('momo_launch_attempt', { 
      code: targetScan.code,
      hasTransaction: !!targetScan.transaction 
    });

    try {
      const telURI = qrScannerServiceNew.createTelURI(targetScan.code);
      
      if (targetScan.transaction) {
        const launchSuccess = await qrScannerServiceNew.markUSSDLaunched(targetScan.transaction.id);
        if (launchSuccess) {
          trackUserAction('ussd_marked_launched');
        }
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
    state.setError(null);
    if (!state.isScanning) {
      state.setIsScanning(true);
      // Restart scanner if stopped
      scanningManager.initializeScanner("qr-reader").then(() => {
        scanningManager.startScanning(
          handleScanSuccess,
          (error) => {
            if (!error.includes('No QR code found')) {
              console.error('Scan error:', error);
            }
          }
        );
      });
    }
  };

  const stopScanning = async () => {
    trackUserAction('stop_scanning_requested');
    state.setIsScanning(false);
    await scanningManager.stop();
  };

  const toggleContinuousMode = () => {
    const newMode = !state.continuousMode;
    state.setContinuousMode(newMode);
    trackUserAction('continuous_mode_toggled', { enabled: newMode });
    
    if (newMode) {
      toastService.info('Continuous Mode', 'Scanner will stay active for multiple scans');
    } else {
      toastService.info('Single Scan Mode', 'Scanner will stop after each scan');
    }
  };

  return {
    handleScanSuccess,
    handleManualInput,
    handleLaunchMoMo,
    handleRescan,
    stopScanning,
    toggleContinuousMode,
    isOnline
  };
};
