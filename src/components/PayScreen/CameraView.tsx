
import React from 'react';
import { Button } from '@/components/ui/button';
import SimpleScannerFrame from './SimpleScannerFrame';

interface CameraViewProps {
  isScanning: boolean;
  scanResult: string | null;
  onRetry: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({
  isScanning,
  scanResult,
  onRetry
}) => {
  return (
    <div className="relative w-full h-full">
      <SimpleScannerFrame
        scanStatus={isScanning ? 'scanning' : 'idle'}
        scanResult={scanResult}
        scanAttempts={0}
        scanDuration={0}
      />
      
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
