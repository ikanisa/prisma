
import React, { useEffect, useState } from "react";
import QRScannerFrame from "./QRScannerFrame";
import ScannerTips from "./ScannerTips";
import { useAmbientLightSensor } from "@/hooks/useAmbientLightSensor";

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
  const lightLevel = useAmbientLightSensor();

  // Shimmer effect on scan box during scanning
  useEffect(() => {
    setShimmer(scanStatus === "scanning" || scanStatus === "processing");
  }, [scanStatus]);

  // Determine overlay opacity based on light conditions
  const overlayOpacity = lightLevel && lightLevel > 600 ? 0.85 : 0.75;

  return (
    <>
      {/* Adaptive dimmed glass overlay */}
      <div 
        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300" 
        style={{ opacity: overlayOpacity }}
      />
      
      {/* Scan overlay with environmental adaptation */}
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
          {/* Enhanced scan box with environmental data */}
          <QRScannerFrame 
            scanStatus={scanStatus} 
            scanResult={scanResult} 
            shimmer={shimmer}
            lightLevel={lightLevel}
          />
          
          {/* Enhanced pulsing background with adaptive colors */}
          {(scanStatus === "scanning" || scanStatus === "processing") && (
            <div className={`absolute inset-0 rounded-4xl animate-pulse shadow-[0_0_0_8px_rgba(57,106,252,0.12)] pointer-events-none ${
              lightLevel && lightLevel > 600 
                ? 'bg-gradient-to-br from-yellow-500/15 via-orange-500/10 to-red-500/10' 
                : 'bg-gradient-to-br from-blue-500/10 via-blue-700/10 to-indigo-500/10'
            }`} />
          )}
          
          <div className="absolute inset-0 rounded-4xl bg-white/6 backdrop-blur-[4px] shadow-inner pointer-events-none" />
        </div>
        
        {/* Enhanced smart tip overlay with environmental context */}
        <ScannerTips scanStatus={scanStatus} lightLevel={lightLevel} />
      </div>
    </>
  );
};

export default ScannerOverlay;
