
import React, { useEffect } from 'react';
import { useUniversalQRScanner } from '@/hooks/useUniversalQRScanner';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import SimpleQRScannerHeader from './SimpleQRScannerHeader';
import SimpleQRScannerCamera from './SimpleQRScannerCamera';
import UniversalQRScannerResult from './UniversalQRScannerResult';
import SimpleQRScannerInstructions from './SimpleQRScannerInstructions';
import AIManualQRInput from './AIManualQRInput';

interface UniversalQRScannerProps {
  onBack: () => void;
}

const UniversalQRScanner: React.FC<UniversalQRScannerProps> = ({ onBack }) => {
  const scanner = useUniversalQRScanner();
  const { playSuccessBeep } = useAudioFeedback();

  useEffect(() => {
    console.log('UniversalQRScanner: Component mounted');
    
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
      console.log('UniversalQRScanner: Component unmounting');
      scanner.cleanup();
    };
  }, []);

  // Play audio feedback when scan result is received
  useEffect(() => {
    if (scanner.scannedResult) {
      playSuccessBeep();
    }
  }, [scanner.scannedResult, playSuccessBeep]);

  const handleLaunchUssd = () => {
    if (scanner.scannedResult?.ussdCode) {
      scanner.launchUssd(scanner.scannedResult.ussdCode);
    }
  };

  return (
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
          scanner.ussdValidation && (
            <UniversalQRScannerResult
              scannedResult={scanner.scannedResult}
              ussdValidation={scanner.ussdValidation}
              onLaunchUssd={handleLaunchUssd}
              onRescan={scanner.rescan}
              onClose={onBack}
            />
          )
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
};

export default UniversalQRScanner;
