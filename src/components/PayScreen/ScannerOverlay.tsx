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
  return;
};
export default ScannerOverlay;