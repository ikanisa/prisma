
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
    console.log('QRScanner component mounted, initializing scanner...');
    scanner.initializeScanner();
    return () => {
      console.log('QRScanner component unmounting, cleaning up...');
      scanner.cleanup();
    };
  }, []);

  // Debug logging for scanner state
  useEffect(() => {
    console.log('QR Scanner State:', {
      isScanning: scanner.isScanning,
      isLoading: scanner.isLoading,
      scannedCode: scanner.scannedCode,
      error: scanner.error,
      showManualInput: scanner.showManualInput,
      isOnline: scanner.isOnline
    });
  }, [scanner.isScanning, scanner.isLoading, scanner.scannedCode, scanner.error]);

  const handleErrorRetry = () => {
    console.log('Error retry requested, attempt:', scanner.retryCount + 1);
    scanner.setShowErrorModal(false);
    scanner.setCurrentError(null);
    scanner.setRetryCount(scanner.retryCount + 1);
    
    if (scanner.retryCount < 3) {
      scanner.initializeScanner();
    } else {
      console.log('Max retries reached, showing manual input');
      scanner.setShowManualInput(true);
    }
  };

  const handleErrorManualInput = () => {
    console.log('Manual input requested from error handler');
    scanner.setShowErrorModal(false);
    scanner.setShowManualInput(true);
  };

  const handleErrorClose = () => {
    console.log('Error modal closed, going back');
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
        onShowManualInput={() => {
          console.log('Manual input requested from controls');
          scanner.setShowManualInput(true);
        }}
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
          onClose={() => {
            console.log('Manual input closed');
            scanner.setShowManualInput(false);
          }}
          onCodeSubmit={(code) => {
            console.log('Manual code submitted:', code);
            scanner.handleManualInput(code);
          }}
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
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 bg-black/80 text-white text-xs p-2 rounded max-w-xs">
          <div>Scanner: {scanner.isScanning ? 'Active' : 'Inactive'}</div>
          <div>Loading: {scanner.isLoading ? 'Yes' : 'No'}</div>
          <div>Online: {scanner.isOnline ? 'Yes' : 'No'}</div>
          <div>Retries: {scanner.retryCount}</div>
          {scanner.error && <div className="text-red-400">Error: {scanner.error}</div>}
        </div>
      )}
    </div>
  );
};

export default QRScanner;
