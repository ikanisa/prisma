
import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { CameraService } from '@/services/CameraService';

interface CameraViewProps {
  isScanning: boolean;
  scanResult: string | null;
  onRetry: () => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

const CameraView: React.FC<CameraViewProps> = ({
  isScanning,
  scanResult,
  onRetry,
  videoRef
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const activeVideoRef = videoRef || localVideoRef;

  useEffect(() => {
    let mounted = true;

    const initCamera = async () => {
      if (isScanning && activeVideoRef.current) {
        try {
          console.log('CameraView: Initializing camera...');
          const success = await CameraService.startCamera(activeVideoRef);
          if (!success && mounted) {
            console.error('CameraView: Failed to start camera');
          }
        } catch (error) {
          console.error('CameraView: Camera initialization error:', error);
        }
      }
    };

    initCamera();

    return () => {
      mounted = false;
      if (!isScanning) {
        CameraService.stopCamera(activeVideoRef);
      }
    };
  }, [isScanning, activeVideoRef]);

  return (
    <div className="relative w-full h-full">
      {/* Video Element */}
      <video
        ref={activeVideoRef}
        className="w-full h-full object-cover rounded-2xl"
        playsInline
        muted
        autoPlay
        style={{ display: isScanning ? 'block' : 'none' }}
      />
      
      {/* Status Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl">
        <div className="text-center text-white p-8">
          {isScanning ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">Scanning...</h3>
              <p className="text-sm opacity-80">Point camera at QR code</p>
            </>
          ) : scanResult ? (
            <>
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Scan Complete!</h3>
              <p className="text-sm opacity-80 break-all">{scanResult}</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Camera Ready</h3>
              <p className="text-sm opacity-80">Ready to scan QR codes</p>
            </>
          )}
        </div>
      </div>
      
      {!isScanning && !scanResult && (
        <div className="absolute bottom-20 left-4 right-4">
          <Button onClick={onRetry} className="w-full">
            Start Scanning
          </Button>
        </div>
      )}
    </div>
  );
};

export default CameraView;
