
import React from 'react';

interface QRScannerViewProps {
  isLoading: boolean;
  lightingCondition: string;
  retryCount: number;
  scannerElementRef: React.RefObject<HTMLDivElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const QRScannerView: React.FC<QRScannerViewProps> = ({
  isLoading,
  lightingCondition,
  retryCount,
  scannerElementRef,
  videoRef
}) => {
  const getLightingTips = () => {
    switch (lightingCondition) {
      case 'bright':
        return ['Move to shade if glare appears', 'Clean camera lens', 'Hold phone steady'];
      case 'dark':
        return ['Enable flashlight above', 'Move to better lighting', 'Hold phone steady'];
      case 'dim':
        return ['Try using flashlight', 'Find better lighting', 'Clean camera lens'];
      default:
        return ['Clean your camera lens', 'Hold phone steady', 'Ensure good lighting'];
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Scanner Container with enhanced styling */}
      <div className="relative">
        <div 
          id="qr-reader" 
          ref={scannerElementRef}
          className={`w-full rounded-2xl overflow-hidden shadow-2xl ${
            lightingCondition === 'dark' ? 'ring-2 ring-yellow-400/50' :
            lightingCondition === 'bright' ? 'ring-2 ring-blue-400/50' :
            'ring-2 ring-blue-500/50'
          }`}
          style={{ 
            filter: `drop-shadow(0 0 20px ${
              lightingCondition === 'dark' ? 'rgba(250, 204, 21, 0.5)' : 
              'rgba(59, 130, 246, 0.5)'
            })` 
          }}
        />
        
        <video ref={videoRef} style={{ display: 'none' }} />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-2xl">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p>Starting camera...</p>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Instructions */}
      <div className="mt-6 text-center">
        <p className="text-white text-lg mb-2">Scan a QR Code to Launch MoMo Payment</p>
        <p className="text-gray-300 text-sm">
          {lightingCondition === 'dark' && 'Low light detected - '}
          {lightingCondition === 'bright' && 'Bright light detected - '}
          Position the QR code within the frame
        </p>
        {retryCount > 0 && (
          <p className="text-yellow-300 text-xs mt-1">
            Scanning attempt {retryCount + 1}/4
          </p>
        )}
      </div>

      {/* Adaptive Tips */}
      <div className="mt-8 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
        <p className="text-white text-sm font-medium mb-2">
          Scanning Tips {lightingCondition !== 'normal' && `(${lightingCondition} lighting)`}:
        </p>
        <ul className="text-gray-300 text-xs space-y-1">
          {getLightingTips().map((tip, index) => (
            <li key={index}>• {tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default QRScannerView;
