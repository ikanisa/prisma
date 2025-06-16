
import React, { useEffect } from 'react';
import { useQRScanner } from '@/hooks/useQRScanner';
import EnhancedFlashlightButton from './EnhancedFlashlightButton';
import AIManualQRInput from './AIManualQRInput';
import QRScannerControls from './QRScannerControls';
import QRScannerResult from './QRScannerResult';
import QRScannerView from './QRScannerView';
import QRScannerHeader from './QRScannerHeader';
import QRScannerErrorHandler from './QRScannerErrorHandler';
import OfflineIndicator from '../OfflineIndicator';
import { scanningManager } from '@/services/scanningManager';

interface QRScannerProps {
  onBack: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onBack }) => {
  const scanner = useQRScanner();

  useEffect(() => {
    scanner.initializeScanner();
    return () => {
      scanner.cleanup();
    };
  }, []);

  const handleErrorRetry = () => {
    scanner.setShowErrorModal(false);
    scanner.setCurrentError(null);
    scanner.setRetryCount(scanner.retryCount + 1);
    
    if (scanner.retryCount < 3) {
      scanner.initializeScanner();
    } else {
      scanner.setShowManualInput(true);
    }
  };

  const handleErrorManualInput = () => {
    scanner.setShowErrorModal(false);
    scanner.setShowManualInput(true);
  };

  const handleErrorClose = () => {
    scanner.setShowErrorModal(false);
    onBack();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <OfflineIndicator />
      
      <QRScannerHeader
        onBack={onBack}
        onRescan={scanner.handleRescan}
        isScanning={scanner.isScanning}
        isOnline={scanner.isOnline}
        scanResult={scanner.scanResult}
      />

      <QRScannerControls
        isScanning={scanner.isScanning}
        isEnhancedMode={scanner.isEnhancedMode}
        onEnhancedScan={scanner.handleEnhancedScan}
        onShowManualInput={() => scanner.setShowManualInput(true)}
      />

      {scanner.isScanning && (
        <EnhancedFlashlightButton
          videoRef={scanner.videoRef}
          onTorchToggle={scanner.handleTorchToggle}
          onLightingChange={scanner.handleLightingChange}
        />
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {scanner.isScanning ? (
          <QRScannerView
            isLoading={scanner.isLoading}
            lightingCondition={scanner.lightingCondition}
            retryCount={scanner.retryCount}
            scannerElementRef={scanner.scannerElementRef}
            videoRef={scanner.videoRef}
          />
        ) : (
          <QRScannerResult
            scannedCode={scanner.scannedCode!}
            scanResult={scanner.scanResult}
            error={scanner.error}
            onLaunchMoMo={scanner.handleLaunchMoMo}
          />
        )}
      </div>

      {scanner.showManualInput && (
        <AIManualQRInput
          onClose={() => scanner.setShowManualInput(false)}
          onCodeSubmit={scanner.handleManualInput}
          lastScannedImage={scanningManager.getLastCapturedFrame()}
        />
      )}

      <QRScannerErrorHandler
        showErrorModal={scanner.showErrorModal}
        currentError={scanner.currentError}
        retryCount={scanner.retryCount}
        onRetry={handleErrorRetry}
        onManualInput={handleErrorManualInput}
        onClose={handleErrorClose}
      />
    </div>
  );
};

export default QRScanner;
