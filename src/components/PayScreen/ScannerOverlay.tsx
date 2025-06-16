
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
  const [overlayIntensity, setOverlayIntensity] = useState(0.75);
  const lightLevel = useAmbientLightSensor();

  // Enhanced shimmer effect with quality-based variations
  useEffect(() => {
    const isActiveScanning = scanStatus === "scanning" || scanStatus === "processing";
    setShimmer(isActiveScanning);
    
    // Adjust shimmer intensity based on scan persistence
    if (isActiveScanning && scanDuration > 5000) {
      // More pronounced shimmer for persistent scanning
      const shimmerElement = document.querySelector('.qr-glow');
      if (shimmerElement) {
        shimmerElement.classList.add('animate-pulse');
      }
    }
  }, [scanStatus, scanDuration]);

  // Advanced overlay opacity calculation with real-time adjustments
  const getAdaptiveOverlayOpacity = () => {
    let baseOpacity = lightLevel && lightLevel > 600 ? 0.85 : 0.75;
    
    // Increase opacity for persistent scanning to reduce eye strain
    if (scanDuration > 5000) {
      baseOpacity += 0.1;
    }
    
    // Adjust for scan quality
    if (scanAttempts >= 3 && scanDuration > 7000) {
      baseOpacity += 0.05; // Slightly darker for struggling scans
    }
    
    // Environmental adjustments
    if (lightLevel && lightLevel > 800) {
      baseOpacity += 0.1; // Much brighter conditions
    } else if (lightLevel && lightLevel < 20) {
      baseOpacity -= 0.1; // Very dark conditions
    }
    
    return Math.min(Math.max(baseOpacity, 0.6), 0.95);
  };

  // Real-time overlay intensity updates
  useEffect(() => {
    const newIntensity = getAdaptiveOverlayOpacity();
    setOverlayIntensity(newIntensity);
  }, [lightLevel, scanDuration, scanAttempts]);

  // Enhanced background pulse with quality-aware colors and urgency
  const getPulsingBackgroundStyles = () => {
    const baseClasses = "absolute inset-0 rounded-4xl pointer-events-none transition-all duration-500";
    
    if (scanDuration > 7000) {
      return `${baseClasses} animate-pulse bg-gradient-to-br from-red-500/25 via-orange-500/20 to-yellow-500/20 shadow-[0_0_60px_rgba(239,68,68,0.25)]`;
    }
    
    if (scanDuration > 4000) {
      return `${baseClasses} animate-pulse bg-gradient-to-br from-yellow-500/20 via-orange-500/15 to-red-500/15 shadow-[0_0_45px_rgba(245,158,11,0.2)]`;
    }
    
    if (lightLevel && lightLevel > 600) {
      return `${baseClasses} animate-pulse bg-gradient-to-br from-yellow-500/15 via-orange-500/10 to-red-500/10 shadow-[0_0_35px_rgba(245,158,11,0.15)]`;
    }
    
    return `${baseClasses} animate-pulse bg-gradient-to-br from-blue-500/10 via-blue-700/10 to-indigo-500/10 shadow-[0_0_30px_rgba(57,106,252,0.12)]`;
  };

  return (
    <>
      {/* Advanced adaptive dimmed overlay with real-time adjustments */}
      <div 
        className="absolute inset-0 bg-black pointer-events-none transition-all duration-500 ease-out" 
        style={{ opacity: overlayIntensity }}
      />
      
      {/* Enhanced scan overlay with intelligent adaptation and visual feedback */}
      <div
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center focus-visible:ring-4 focus-visible:ring-blue-400 transition-all duration-300`}
        aria-live="polite"
        tabIndex={0}
        style={{ outline: "none" }}
      >
        <div
          className={`relative transition-all duration-500 ease-out`}
          style={{
            width: SCAN_BOX_SIZE,
            height: SCAN_BOX_SIZE,
            maxWidth: 370,
            maxHeight: 370,
            transform: scanDuration > 7000 ? 'scale(1.02)' : 'scale(1)', // Subtle scale for attention
          }}
        >
          {/* Enhanced scan box with comprehensive environmental data and persistence tracking */}
          <QRScannerFrame 
            scanStatus={scanStatus} 
            scanResult={scanResult} 
            shimmer={shimmer}
            lightLevel={lightLevel}
            scanAttempts={scanAttempts}
            scanDuration={scanDuration}
          />
          
          {/* Advanced pulsing background with adaptive colors and intelligent urgency indicators */}
          {(scanStatus === "scanning" || scanStatus === "processing") && (
            <div className={getPulsingBackgroundStyles()} />
          )}
          
          {/* Enhanced glassmorphism backdrop with quality-based adjustments */}
          <div className={`absolute inset-0 rounded-4xl backdrop-blur-[4px] shadow-inner pointer-events-none transition-all duration-500 ${
            scanDuration > 7000 
              ? 'bg-white/8 shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]'
              : 'bg-white/6'
          }`} />
          
          {/* Real-time performance indicator for development */}
          {process.env.NODE_ENV === 'development' && scanAttempts > 0 && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-white/70 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
              Quality: {scanDuration > 7000 && scanAttempts >= 3 ? 'Poor' : 
                       scanDuration > 4000 && scanAttempts >= 2 ? 'Fair' : 'Good'}
            </div>
          )}
        </div>
        
        {/* Enhanced smart tip overlay with advanced intelligence and persistence tracking */}
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
