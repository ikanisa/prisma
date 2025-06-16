
import React, { useEffect, useState } from "react";
import QRScannerFrame from "./QRScannerFrame";
import ScannerTips from "./ScannerTips";
import { useAmbientLightSensor } from "@/hooks/useAmbientLightSensor";

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

interface ScannerOverlayProps {
  scanStatus: ScanStatus;
  scanResult: string | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  scanAttempts?: number;
  scanDuration?: number;
}

const SCAN_BOX_SIZE = "min(84vw, 80vh)";

const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  scanStatus,
  scanResult,
  canvasRef,
  scanAttempts = 0,
  scanDuration = 0
}) => {
  const [shimmer, setShimmer] = useState(false);
  const lightLevel = useAmbientLightSensor();

  // Shimmer effect on scan box during scanning
  useEffect(() => {
    setShimmer(scanStatus === "scanning" || scanStatus === "processing");
  }, [scanStatus]);

  // Determine overlay opacity based on light conditions and scan persistence
  const getOverlayOpacity = () => {
    let baseOpacity = lightLevel && lightLevel > 600 ? 0.85 : 0.75;
    
    // Increase opacity for persistent scanning to reduce eye strain
    if (scanDuration > 5000) {
      baseOpacity += 0.1;
    }
    
    return Math.min(baseOpacity, 0.9);
  };

  return (
    <>
      {/* Adaptive dimmed glass overlay with persistence awareness */}
      <div 
        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300" 
        style={{ opacity: getOverlayOpacity() }}
      />
      
      {/* Scan overlay with environmental adaptation and intelligent guidance */}
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
          {/* Enhanced scan box with environmental data and persistence indicators */}
          <QRScannerFrame 
            scanStatus={scanStatus} 
            scanResult={scanResult} 
            shimmer={shimmer}
            lightLevel={lightLevel}
            scanAttempts={scanAttempts}
            scanDuration={scanDuration}
          />
          
          {/* Enhanced pulsing background with adaptive colors and urgency indicators */}
          {(scanStatus === "scanning" || scanStatus === "processing") && (
            <div className={`absolute inset-0 rounded-4xl shadow-[0_0_0_8px_rgba(57,106,252,0.12)] pointer-events-none transition-all duration-300 ${
              scanDuration > 7000 
                ? 'animate-pulse bg-gradient-to-br from-red-500/20 via-orange-500/15 to-yellow-500/15 shadow-[0_0_0_12px_rgba(239,68,68,0.15)]'
                : lightLevel && lightLevel > 600 
                  ? 'animate-pulse bg-gradient-to-br from-yellow-500/15 via-orange-500/10 to-red-500/10' 
                  : 'animate-pulse bg-gradient-to-br from-blue-500/10 via-blue-700/10 to-indigo-500/10'
            }`} />
          )}
          
          <div className="absolute inset-0 rounded-4xl bg-white/6 backdrop-blur-[4px] shadow-inner pointer-events-none" />
        </div>
        
        {/* Enhanced smart tip overlay with intelligent guidance and persistence tracking */}
        <ScannerTips 
          scanStatus={scanStatus} 
          lightLevel={lightLevel} 
          scanAttempts={scanAttempts}
          scanDuration={scanDuration}
        />
      </div>
    </>
  );
};

export default ScannerOverlay;
