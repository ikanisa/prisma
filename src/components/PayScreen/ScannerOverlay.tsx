
import React, { useEffect, useState, useMemo } from "react";
import QRScannerFrame from "./QRScannerFrame";
import ScannerTips from "./ScannerTips";
import OptimizedScannerRenderer from "./OptimizedScannerRenderer";
import { useAmbientLightSensor } from "@/hooks/useAmbientLightSensor";

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

interface ScannerOverlayProps {
  scanStatus: ScanStatus;
  scanResult: string | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  scanAttempts?: number;
  scanDuration?: number;
  performanceConfig?: {
    fps: number;
    enableAnimations: boolean;
    enableBlur: boolean;
    enableShadows: boolean;
  };
}

const SCAN_BOX_SIZE = "min(84vw, 80vh)";

const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  scanStatus,
  scanResult,
  canvasRef,
  scanAttempts = 0,
  scanDuration = 0,
  performanceConfig
}) => {
  const [shimmer, setShimmer] = useState(false);
  const lightLevel = useAmbientLightSensor();

  // Memoized frame quality calculation for performance
  const frameQuality = useMemo(() => {
    if (scanDuration > 7000 && scanAttempts >= 3) return "poor";
    if (scanDuration > 4000 && scanAttempts >= 2) return "fair";
    if (lightLevel && (lightLevel < 20 || lightLevel > 800)) return "challenging";
    return "good";
  }, [scanDuration, scanAttempts, lightLevel]);

  // Performance-optimized shimmer effect
  useEffect(() => {
    const isActiveScanning = scanStatus === "scanning" || scanStatus === "processing";
    setShimmer(isActiveScanning && performanceConfig?.enableAnimations !== false);

    // Enhanced shimmer for persistent scanning (only if animations enabled)
    if (isActiveScanning && scanDuration > 5000 && performanceConfig?.enableAnimations) {
      const shimmerElement = document.querySelector('.qr-glow');
      if (shimmerElement) {
        shimmerElement.classList.add('animate-pulse');
      }
    }
  }, [scanStatus, scanDuration, performanceConfig?.enableAnimations]);

  return (
    <OptimizedScannerRenderer 
      scanStatus={scanStatus} 
      frameQuality={frameQuality} 
      lightLevel={lightLevel} 
      scanDuration={scanDuration}
    >
      {/* Enhanced scan overlay with performance-aware positioning */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className="relative"
          style={{
            width: SCAN_BOX_SIZE,
            height: SCAN_BOX_SIZE,
          }}
        >
          <QRScannerFrame
            scanStatus={scanStatus}
            scanResult={scanResult}
            shimmer={shimmer}
            lightLevel={lightLevel}
            scanAttempts={scanAttempts}
            scanDuration={scanDuration}
            performanceConfig={performanceConfig}
          />
        </div>
      </div>
      
      {/* Scanner tips positioned at bottom */}
      <div className="absolute bottom-24 left-0 right-0 px-4">
        <ScannerTips
          scanStatus={scanStatus}
          scanAttempts={scanAttempts}
          scanDuration={scanDuration}
          lightLevel={lightLevel}
        />
      </div>
    </OptimizedScannerRenderer>
  );
};

export default ScannerOverlay;
