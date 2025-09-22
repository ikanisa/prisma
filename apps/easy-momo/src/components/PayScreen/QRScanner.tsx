
import React, { useEffect } from 'react';
import { useQRScanner } from '@/hooks/useQRScanner';
import EnhancedFlashlightButton from './EnhancedFlashlightButton';
import AIManualQRInput from './AIManualQRInput';
import QRScannerControls from './QRScannerControls';
import QRScannerView from './QRScannerView';
import QRScannerHeader from './QRScannerHeader';
import QRScannerErrorHandler from './QRScannerErrorHandler';
import QRScannerMultiResult from './QRScannerMultiResult';
import OfflineIndicator from '../OfflineIndicator';
import { scanningManager } from '@/services/scanningManager';

interface QRScannerProps {
  onBack: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onBack }) => {
  const scanner = useQRScanner();

  useEffect(() => {
    console.log('QRScanner component mounted - continuous mode enabled');
    // Load previous scan history
    scanner.loadScanHistory();
    
    // Cleanup on unmount
    return () => {
      console.log('QRScanner component unmounting, cleaning up...');
      scanner.cleanup();
    };
  }, []);

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
        scanResult={scanner.getLatestScan()?.result || null}
        scannedCount={scanner.scannedCodes.length}
        continuousMode={scanner.continuousMode}
        onToggleContinuous={scanner.toggleContinuousMode}
        onStopScanning={scanner.stopScanning}
        onClearHistory={scanner.clearScanHistory}
      />

      <QRScannerControls
        isScanning={scanner.isScanning}
        isEnhancedMode={scanner.isEnhancedMode}
        onEnhancedScan={scanner.handleEnhancedScan}
        onShowManualInput={() => {
          console.log('Manual input requested from controls');
          scanner.setShowManualInput(true);
        }}
        continuousMode={scanner.continuousMode}
        onToggleContinuous={scanner.toggleContinuousMode}
      />

      {scanner.isScanning && (
        <EnhancedFlashlightButton
          videoRef={scanner.videoRef}
          onTorchToggle={scanner.handleTorchToggle}
          onLightingChange={scanner.handleLightingChange}
        />
      )}

      <div className="flex-1 flex flex-col">
        {/* Scanner View */}
        {scanner.isScanning && (
          <div className="flex-1">
            <QRScannerView
              isLoading={scanner.isLoading}
              lightingCondition={scanner.lightingCondition}
              retryCount={scanner.retryCount}
              scannerElementRef={scanner.scannerElementRef}
              videoRef={scanner.videoRef}
              onScannerReady={scanner.handleScannerReady}
            />
          </div>
        )}

        {/* Multi-Scan Results */}
        {scanner.scannedCodes.length > 0 && (
          <QRScannerMultiResult
            scannedCodes={scanner.scannedCodes}
            onLaunchMoMo={scanner.handleLaunchMoMo}
            isScanning={scanner.isScanning}
            error={scanner.error}
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
          <div>Continuous: {scanner.continuousMode ? 'On' : 'Off'}</div>
          <div>Scans: {scanner.scannedCodes.length}</div>
          <div>Ready: {scanner.scannerReady ? 'Yes' : 'No'}</div>
          <div>Online: {scanner.isOnline ? 'Yes' : 'No'}</div>
          {scanner.error && <div className="text-red-400">Error: {scanner.error}</div>}
        </div>
      )}
    </div>
  );
};

export default QRScanner;
