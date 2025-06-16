
import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimpleQRScannerCameraProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
  isScanning: boolean;
  onStartScanning: () => void;
  onShowManualInput: () => void;
}

const SimpleQRScannerCamera: React.FC<SimpleQRScannerCameraProps> = ({
  videoRef,
  isLoading,
  hasError,
  errorMessage,
  isScanning,
  onStartScanning,
  onShowManualInput
}) => {
  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="relative">
        <video 
          ref={videoRef}
          className="w-full rounded-2xl overflow-hidden shadow-2xl"
          style={{ aspectRatio: '1/1' }}
          playsInline
          muted
          autoPlay
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-2xl">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p>Requesting camera access...</p>
            </div>
          </div>
        )}
        
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-2xl">
            <div className="text-center text-white p-4">
              <p className="text-red-400 mb-4">{errorMessage}</p>
              <div className="space-y-2">
                <Button
                  onClick={onStartScanning}
                  variant="outline"
                  className="w-full border-blue-400/40 text-blue-100 hover:bg-blue-500/20"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={onShowManualInput}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Enter Code Manually
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Scanning Guide Overlay */}
        {!isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white/50 rounded-lg animate-pulse">
              <div className="w-full h-full border-4 border-transparent border-t-blue-500 border-l-blue-500 rounded-lg"></div>
            </div>
          </div>
        )}
      </div>

      {/* Status Text */}
      <div className="mt-6 text-center">
        <p className="text-white text-lg mb-2">Position QR code within the frame</p>
        <p className="text-gray-300 text-sm">
          {isScanning ? 'Scanning...' : 'Camera starting...'}
        </p>
      </div>
    </div>
  );
};

export default SimpleQRScannerCamera;
