
import React, { useEffect } from 'react';
import { ArrowLeft, Flashlight, FlashlightOff, RotateCcw, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSimpleQRScanner } from '@/hooks/useSimpleQRScanner';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
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

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-60 bg-gradient-to-b from-black/80 to-transparent p-4 safe-area-top">
        <div className="flex items-center justify-between">
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 rounded-full p-2"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <div className="text-center">
            <h2 className="text-white font-semibold">Scan QR Code</h2>
            <p className="text-white/80 text-sm">Point camera at Mobile Money QR</p>
          </div>
          
          <div className="flex items-center space-x-2">
            {scanner.hasTorch && (
              <Button
                onClick={scanner.toggleTorch}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 rounded-full p-2"
              >
                {scanner.isTorchOn ? (
                  <FlashlightOff className="w-5 h-5" />
                ) : (
                  <Flashlight className="w-5 h-5" />
                )}
              </Button>
            )}
            
            <Button
              onClick={() => scanner.setShowManualInput(true)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 rounded-full p-2"
            >
              <Edit3 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 pt-20">
        {!scanner.scannedResult ? (
          // Scanner View
          <div className="w-full max-w-sm mx-auto">
            <div className="relative">
              <video 
                ref={scanner.videoRef}
                className="w-full rounded-2xl overflow-hidden shadow-2xl"
                style={{ aspectRatio: '1/1' }}
                playsInline
                muted
                autoPlay
              />
              
              {scanner.isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-2xl">
                  <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p>Requesting camera access...</p>
                  </div>
                </div>
              )}
              
              {scanner.hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-2xl">
                  <div className="text-center text-white p-4">
                    <p className="text-red-400 mb-4">{scanner.errorMessage}</p>
                    <div className="space-y-2">
                      <Button
                        onClick={scanner.startScanning}
                        variant="outline"
                        className="w-full border-blue-400/40 text-blue-100 hover:bg-blue-500/20"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                      <Button
                        onClick={() => scanner.setShowManualInput(true)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        Enter Code Manually
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Scanning Guide Overlay */}
              {!scanner.isLoading && !scanner.hasError && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-white/50 rounded-lg animate-pulse">
                    <div className="w-full h-full border-4 border-transparent border-t-blue-500 border-l-blue-500 rounded-lg"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="mt-6 text-center">
              <p className="text-white text-lg mb-2">Position QR code within the frame</p>
              <p className="text-gray-300 text-sm">
                {scanner.isScanning ? 'Scanning...' : 'Camera starting...'}
              </p>
            </div>

            {/* Tips */}
            <div className="mt-8 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-white text-sm font-medium mb-2">Scanning Tips:</p>
              <ul className="text-gray-300 text-xs space-y-1">
                <li>• Hold phone steady</li>
                <li>• Ensure good lighting</li>
                <li>• Clean camera lens</li>
                <li>• Use flashlight if needed</li>
              </ul>
            </div>
          </div>
        ) : (
          // Result View
          <div className="w-full max-w-sm mx-auto text-center">
            <div className="bg-green-500/20 rounded-2xl p-6 mb-6">
              <div className="text-6xl mb-4">✓</div>
              <h3 className="text-white text-xl font-semibold mb-2">QR Code Scanned!</h3>
              <p className="text-gray-300 text-sm">Tap the button below to launch MoMo</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 mb-6 backdrop-blur-sm">
              <p className="text-white text-sm mb-2">Scanned Code:</p>
              <p className="text-blue-300 font-mono text-lg break-all">
                {scanner.scannedResult.ussdCode || scanner.scannedResult.code}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleLaunchMoMo}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3"
              >
                Launch MoMo Payment
              </Button>
              
              <Button
                onClick={scanner.rescan}
                variant="outline"
                className="w-full border-blue-400/40 text-blue-100 hover:bg-blue-500/20"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Scan Another Code
              </Button>
            </div>
          </div>
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

export default SimpleQRScanner;
