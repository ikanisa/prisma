
import React from "react";
import SimpleScannerFrame from "./SimpleScannerFrame";
import SimpleScannerTips from "./SimpleScannerTips";

interface ScannerOverlayProps {
  scanStatus: string;
  scanResult: string | null;
  scanAttempts: number;
  scanDuration: number;
  lightLevel?: number | null;
}

const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  scanStatus,
  scanResult,
  scanAttempts,
  scanDuration,
  lightLevel
}) => {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-700/10 to-indigo-500/10 backdrop-blur-md">
      {/* Scanner frame */}
      <SimpleScannerFrame
        scanStatus={scanStatus}
        scanResult={scanResult}
        scanAttempts={scanAttempts}
        scanDuration={scanDuration}
        lightLevel={lightLevel}
      />
      
      {/* Tips */}
      <SimpleScannerTips 
        scanStatus={scanStatus}
        scanAttempts={scanAttempts}
        scanDuration={scanDuration}
        lightLevel={lightLevel}
      />
    </div>
  );
};

export default ScannerOverlay;
