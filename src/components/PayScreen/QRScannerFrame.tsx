
import React, { useMemo } from 'react';
import ScannerCorners from './ScannerCorners';
import ScanningLine from './ScanningLine';
import QualityIndicators from './QualityIndicators';
import ScannerInstructions from './ScannerInstructions';

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

interface QRScannerFrameProps {
  scanStatus?: ScanStatus;
  scanResult?: string | null;
  shimmer?: boolean;
  lightLevel?: number | null;
  scanAttempts?: number;
  scanDuration?: number;
  performanceConfig?: {
    fps: number;
    enableAnimations: boolean;
    enableBlur: boolean;
    enableShadows: boolean;
  };
}

const QRScannerFrame: React.FC<QRScannerFrameProps> = ({
  scanStatus,
  scanResult,
  shimmer,
  lightLevel,
  scanAttempts = 0,
  scanDuration = 0,
  performanceConfig
}) => {
  // Memoized calculations to prevent unnecessary re-renders
  const { needsAntiGlare, needsContrast, frameQuality } = useMemo(() => {
    const needsAntiGlare = lightLevel && lightLevel > 600;
    const needsContrast = lightLevel && lightLevel < 50;
    
    let quality = "good";
    if (scanDuration > 7000 && scanAttempts >= 3) quality = "poor";
    else if (scanDuration > 4000 && scanAttempts >= 2) quality = "fair";
    else if (lightLevel && (lightLevel < 20 || lightLevel > 800)) quality = "challenging";
    
    return { needsAntiGlare, needsContrast, frameQuality: quality };
  }, [lightLevel, scanDuration, scanAttempts]);
  
  // Performance-optimized frame styles
  const frameStyles = useMemo(() => {
    const baseStyles = "relative w-72 h-72 xs:w-80 xs:h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] lg:w-[32rem] lg:h-[32rem] rounded-4xl border-4 ring-4 qr-glow overflow-hidden";
    
    const blurClass = performanceConfig?.enableBlur ? "backdrop-blur-4xl" : "";
    const shadowClass = performanceConfig?.enableShadows ? "shadow-2xl" : "shadow-lg";
    const animationClass = performanceConfig?.enableAnimations && shimmer ? "animate-pulse" : "";
    const transitionClass = performanceConfig?.enableAnimations ? "transition-all duration-500" : "";
    
    if (frameQuality === "poor") {
      return `${baseStyles} ${blurClass} ${shadowClass} ${transitionClass} bg-red-500/20 border-red-400/40 ring-red-400/50 shadow-[0_0_40px_rgba(239,68,68,0.4)] ${animationClass}`;
    }
    
    if (frameQuality === "fair") {
      return `${baseStyles} ${blurClass} ${shadowClass} ${transitionClass} bg-yellow-500/15 border-yellow-400/35 ring-yellow-400/40 shadow-[0_0_30px_rgba(245,158,11,0.3)] ${animationClass}`;
    }
    
    if (frameQuality === "challenging") {
      return `${baseStyles} ${blurClass} ${shadowClass} ${transitionClass} bg-purple-500/15 border-purple-400/35 ring-purple-400/40 shadow-[0_0_35px_rgba(147,51,234,0.35)] ${animationClass}`;
    }
    
    return `${baseStyles} ${blurClass} ${shadowClass} ${transitionClass} bg-white/10 dark:bg-black/30 border-white/25 ring-blue-400/30 ${animationClass}`;
  }, [frameQuality, performanceConfig, shimmer]);
  
  // Performance-optimized corner color
  const cornerColor = useMemo(() => {
    if (frameQuality === "poor") return "border-red-400/90";
    if (frameQuality === "fair") return "border-yellow-400/90";
    if (frameQuality === "challenging") return "border-purple-400/90";
    return needsAntiGlare ? 'border-yellow-400/90' : 'border-blue-400/90';
  }, [frameQuality, needsAntiGlare]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10" aria-hidden="false">
      <div className="relative">
        {/* Performance-aware adaptive overlays */}
        {needsAntiGlare && (
          <div className={`absolute inset-0 bg-black/20 rounded-4xl pointer-events-none z-5 ${
            performanceConfig?.enableAnimations ? 'transition-opacity duration-300' : ''
          }`} />
        )}
        
        {needsContrast && (
          <div className={`absolute inset-0 bg-white/10 rounded-4xl pointer-events-none z-5 ${
            performanceConfig?.enableAnimations ? 'transition-opacity duration-300' : ''
          }`} />
        )}
        
        {/* Quality-based enhancement overlay */}
        {frameQuality === "poor" && performanceConfig?.enableAnimations && (
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-orange-500/10 rounded-4xl pointer-events-none z-5 animate-pulse" />
        )}

        {/* Main scanner frame */}
        <div className={frameStyles}>
          
          {/* Scanning line animation */}
          <div className="absolute top-6 left-6 right-6 h-[calc(100%-3rem)] z-10 pointer-events-none">
            <div className="relative w-full h-full">
              {scanStatus === 'scanning' && (
                <ScanningLine frameQuality={frameQuality} performanceConfig={performanceConfig} />
              )}
            </div>
          </div>

          {/* Corner indicators */}
          <ScannerCorners cornerColor={cornerColor} performanceConfig={performanceConfig} />
          
          {/* Performance-optimized dimming overlay */}
          <div className={`absolute inset-2 rounded-3xl pointer-events-none ${
            performanceConfig?.enableAnimations ? 'transition-all duration-500' : ''
          } ${
            frameQuality === "poor" 
              ? 'bg-gradient-to-br from-red-500/10 via-black/10 to-orange-500/10'
              : 'bg-gradient-to-br from-transparent via-black/5 to-transparent'
          }`} />
          
          {/* Quality and performance indicators */}
          <QualityIndicators 
            frameQuality={frameQuality}
            scanAttempts={scanAttempts}
            lightLevel={lightLevel}
            performanceConfig={performanceConfig}
          />
        </div>
        
        {/* Performance-optimized adaptive spotlight */}
        <div className={`absolute inset-0 z-0 pointer-events-none ${
          performanceConfig?.enableAnimations ? 'transition-all duration-500' : ''
        }`} aria-hidden="true">
          <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            <defs>
              <radialGradient id="performance-adaptive-spotlight" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="67%" stopColor="rgba(20,22,50,0)" />
                <stop offset="81%" stopColor={
                  frameQuality === "poor" ? "rgba(0,0,0,0.75)" :
                  frameQuality === "fair" ? "rgba(0,0,0,0.65)" :
                  needsAntiGlare ? "rgba(0,0,0,0.6)" : "rgba(13,15,30,0.38)"
                } />
                <stop offset="100%" stopColor={
                  frameQuality === "poor" ? "rgba(0,0,0,0.9)" :
                  frameQuality === "fair" ? "rgba(0,0,0,0.85)" :
                  needsAntiGlare ? "rgba(0,0,0,0.85)" : "rgba(13,15,30,0.82)"
                } />
              </radialGradient>
            </defs>
            <rect width="100" height="100" fill="url(#performance-adaptive-spotlight)" />
          </svg>
        </div>
        
        {/* Scanner instructions */}
        <ScannerInstructions 
          scanStatus={scanStatus}
          scanResult={scanResult}
          frameQuality={frameQuality}
          needsAntiGlare={needsAntiGlare}
          needsContrast={needsContrast}
          performanceConfig={performanceConfig}
        />
      </div>
      
      {/* Performance-optimized styles */}
      <style>
        {`
          @keyframes scanline {
            0% { top: 4px; opacity: 0.15;}
            12% { opacity: 1;}
            48% { top: calc(100% - 12px); opacity: 0.75;}
            100% { top: 4px; opacity: 0.15;}
          }
          
          ${!performanceConfig?.enableAnimations ? `
            .animate-pulse { animation: none !important; }
            .transition-all { transition: none !important; }
          ` : ''}
        `}
      </style>
    </div>
  );
};

export default QRScannerFrame;
