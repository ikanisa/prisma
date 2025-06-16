
import React, { useEffect } from 'react';
import { useSimpleQRScanner } from '@/hooks/useSimpleQRScanner';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import SimpleQRScannerHeader from './SimpleQRScannerHeader';
import SimpleQRScannerCamera from './SimpleQRScannerCamera';
import SimpleQRScannerResult from './SimpleQRScannerResult';
import SimpleQRScannerInstructions from './SimpleQRScannerInstructions';
import QRScannerIntegrationWrapper from './QRScannerIntegrationWrapper';
import AIManualQRInput from './AIManualQRInput';

interface SimpleQRScannerProps {
  onBack: () => void;
}

const SimpleQRScanner: React.FC<SimpleQRScannerProps> = ({ onBack }) => {
  const scanner = useSimpleQRScanner();
  const { playSuccessBeep } = useAudioFeedback();

  useEffect(() => {
    console.log('SimpleQRScanner: Component mounted');
    
    const initScanner = async () => {
      if (scanner.videoRef.current) {
        await scanner.initialize();
      } else {
        setTimeout(() => {
          if (scanner.videoRef.current) {
            scanner.initialize();
          }
        }, 100);
      }
    };

    initScanner();

    return () => {
      console.log('SimpleQRScanner: Component unmounting');
      scanner.cleanup();
    };
  }, []);

  // Play audio feedback when scan result is received
  useEffect(() => {
    if (scanner.scannedResult) {
      playSuccessBeep();
    }
  }, [scanner.scannedResult, playSuccessBeep]);

  const handleLaunchMoMo = () => {
    if (scanner.scannedResult?.ussdCode) {
      scanner.launchMoMo(scanner.scannedResult.ussdCode);
    }
  };

  const scannerContent = (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <SimpleQRScannerHeader
        onBack={onBack}
        hasTorch={scanner.hasTorch}
        isTorchOn={scanner.isTorchOn}
        onToggleTorch={scanner.toggleTorch}
        onShowManualInput={() => scanner.setShowManualInput(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 pt-20">
        {!scanner.scannedResult ? (
          <>
            <SimpleQRScannerCamera
              videoRef={scanner.videoRef}
              isLoading={scanner.isLoading}
              hasError={scanner.hasError}
              errorMessage={scanner.errorMessage}
              isScanning={scanner.isScanning}
              onStartScanning={scanner.startScanning}
              onShowManualInput={() => scanner.setShowManualInput(true)}
            />
            <SimpleQRScannerInstructions />
          </>
        ) : (
          <SimpleQRScannerResult
            scannedResult={scanner.scannedResult}
            onLaunchMoMo={handleLaunchMoMo}
            onRescan={scanner.rescan}
          />
        )}
      </div>

      {/* Manual Input Modal */}
      {scanner.showManualInput && (
        <AIManualQRInput
          onClose={() => scanner.setShowManualInput(false)}
          onCodeSubmit={scanner.handleManualInput}
          lastScannedImage={null}
        />
      )}
    </div>
  );

  // Wrap with integration testing in development mode
  if (process.env.NODE_ENV === 'development') {
    return (
      <QRScannerIntegrationWrapper
        enableIntegrationTests={false} // Set to true for testing
        enablePerformanceOptimization={true}
      >
        {scannerContent}
      </QRScannerIntegrationWrapper>
    );
  }

  return scannerContent;
};

export default SimpleQRScanner;
