
import React, { useEffect, useState } from "react";
import QRScannerFrame from "./QRScannerFrame";
import ScannerTips from "./ScannerTips";

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

interface ScannerOverlayProps {
  scanStatus: ScanStatus;
  scanResult: string | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const SCAN_BOX_SIZE = "min(84vw, 80vh)";

const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  scanStatus,
  scanResult,
  canvasRef
}) => {
  const [shimmer, setShimmer] = useState(false);

  // Shimmer effect on scan box during scanning
  useEffect(() => {
    setShimmer(scanStatus === "scanning" || scanStatus === "processing");
  }, [scanStatus]);

  return (
    <>
      {/* Dimmed glass overlay */}
      <div className="absolute inset-0 bg-black/80 pointer-events-none" />
      
      {/* Scan overlay */}
      <div
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center focus-visible:ring-4 focus-visible:ring-blue-400 transition`}
        aria-live="polite"
        tabIndex={0}
        style={{ outline: "none" }}
      >
        <div
          className={`relative`}
          style={{
            width: SCAN_BOX_SIZE,
            height: SCAN_BOX_SIZE,
            maxWidth: 370,
            maxHeight: 370,
          }}
        >
          {/* Scan box + shimmer */}
          <QRScannerFrame scanStatus={scanStatus} scanResult={scanResult} shimmer={shimmer} />
          
          {/* Pulsing background on scan */}
          {(scanStatus === "scanning" || scanStatus === "processing") && (
            <div className="absolute inset-0 rounded-4xl animate-pulse bg-gradient-to-br from-blue-500/10 via-blue-700/10 to-indigo-500/10 shadow-[0_0_0_8px_rgba(57,106,252,0.12)] pointer-events-none" />
          )}
          <div className="absolute inset-0 rounded-4xl bg-white/6 backdrop-blur-[4px] shadow-inner pointer-events-none" />
        </div>
        
        {/* Smart tip overlay at bottom of frame */}
        <ScannerTips scanStatus={scanStatus} />
      </div>
    </>
  );
};

export default ScannerOverlay;
