
import React, { useEffect, useRef } from 'react';

interface QRScannerViewProps {
  isLoading: boolean;
  lightingCondition: string;
  retryCount: number;
  scannerElementRef: React.RefObject<HTMLDivElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
  onScannerReady?: () => void;
}

const QRScannerView: React.FC<QRScannerViewProps> = ({
  isLoading,
  lightingCondition,
  retryCount,
  scannerElementRef,
  videoRef,
  onScannerReady
}) => {
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    
    // Notify parent when scanner element is ready
    const checkReady = () => {
      if (mountedRef.current && scannerElementRef.current && onScannerReady) {
        console.log('QRScannerView: Scanner element ready, notifying parent');
        onScannerReady();
      }
    };

    // Check immediately and after a short delay
    checkReady();
    const timeoutId = setTimeout(checkReady, 100);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
    };
  }, [scannerElementRef, onScannerReady]);

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

  const getRingColor = () => {
    switch (lightingCondition) {
      case 'dark': return 'ring-yellow-400/50';
      case 'bright': return 'ring-blue-400/50';
      default: return 'ring-blue-500/50';
    }
  };

  const getDropShadowColor = () => {
    switch (lightingCondition) {
      case 'dark': return 'rgba(250, 204, 21, 0.5)';
      default: return 'rgba(59, 130, 246, 0.5)';
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Scanner Container with enhanced styling */}
      <div className="relative">
        <div 
          id="qr-reader" 
          ref={scannerElementRef}
          className={`w-full rounded-2xl overflow-hidden shadow-2xl ${getRingColor()}`}
          style={{ 
            minHeight: '300px',
            filter: `drop-shadow(0 0 20px ${getDropShadowColor()})` 
          }}
        />
        
        {/* Hidden video element for enhanced camera service */}
        <video 
          ref={videoRef} 
          style={{ display: 'none' }}
          playsInline
          muted
          autoPlay
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-2xl">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p>Starting camera...</p>
              {retryCount > 0 && (
                <p className="text-sm text-gray-300 mt-1">Attempt {retryCount + 1}</p>
              )}
            </div>
          </div>
        )}
        
        {/* Scanning overlay when not loading */}
        {!isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white/50 rounded-lg">
              <div className="w-full h-full border-4 border-transparent border-t-blue-500 border-l-blue-500 rounded-lg animate-pulse"></div>
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
