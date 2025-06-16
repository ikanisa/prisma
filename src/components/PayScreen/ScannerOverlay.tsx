
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
    <>
      <SimpleScannerFrame
        scanStatus={scanStatus}
        scanResult={scanResult}
        scanAttempts={scanAttempts}
        scanDuration={scanDuration}
        lightLevel={lightLevel}
      />
      
      <SimpleScannerTips
        scanStatus={scanStatus}
        lightLevel={lightLevel}
        scanAttempts={scanAttempts}
        scanDuration={scanDuration}
      />
    </>
  );
};

export default ScannerOverlay;
