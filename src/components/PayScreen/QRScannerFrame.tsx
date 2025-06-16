
import React from 'react';

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

interface QRScannerFrameProps {
  scanStatus?: ScanStatus;
  scanResult?: string | null;
  shimmer?: boolean;
  lightLevel?: number | null;
  scanAttempts?: number;
  scanDuration?: number;
}

const QRScannerFrame: React.FC<QRScannerFrameProps> = ({
  scanStatus,
  scanResult,
  shimmer,
  lightLevel,
  scanAttempts = 0,
  scanDuration = 0
}) => {
  // Determine if we need anti-glare overlay based on light level
  const needsAntiGlare = lightLevel && lightLevel > 600;
  const needsContrast = lightLevel && lightLevel < 50;
  
  // Calculate frame quality assessment for visual feedback
  const getFrameQuality = () => {
    if (scanDuration > 7000 && scanAttempts >= 3) return "poor";
    if (scanDuration > 4000 && scanAttempts >= 2) return "fair";
    if (lightLevel && (lightLevel < 20 || lightLevel > 800)) return "challenging";
    return "good";
  };
  
  const frameQuality = getFrameQuality();
  
  // Enhanced visual feedback based on frame quality and persistence
  const getFrameStyles = () => {
    const baseStyles = "relative w-72 h-72 xs:w-80 xs:h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] lg:w-[32rem] lg:h-[32rem] rounded-4xl backdrop-blur-4xl border-4 shadow-2xl ring-4 qr-glow overflow-hidden transition-all duration-500";
    
    if (frameQuality === "poor") {
      return `${baseStyles} bg-red-500/20 border-red-400/40 ring-red-400/50 shadow-[0_0_40px_rgba(239,68,68,0.4)] ${shimmer ? 'animate-pulse' : ''}`;
    }
    
    if (frameQuality === "fair") {
      return `${baseStyles} bg-yellow-500/15 border-yellow-400/35 ring-yellow-400/40 shadow-[0_0_30px_rgba(245,158,11,0.3)] ${shimmer ? 'animate-pulse' : ''}`;
    }
    
    if (frameQuality === "challenging") {
      return `${baseStyles} bg-purple-500/15 border-purple-400/35 ring-purple-400/40 shadow-[0_0_35px_rgba(147,51,234,0.35)] ${shimmer ? 'animate-pulse' : ''}`;
    }
    
    return `${baseStyles} bg-white/10 dark:bg-black/30 border-white/25 ring-blue-400/30 ${shimmer ? 'animate-pulse' : ''}`;
  };
  
  // Enhanced corner indicator colors based on conditions
  const getCornerColor = () => {
    if (frameQuality === "poor") return "border-red-400/90";
    if (frameQuality === "fair") return "border-yellow-400/90";
    if (frameQuality === "challenging") return "border-purple-400/90";
    return needsAntiGlare ? 'border-yellow-400/90' : 'border-blue-400/90';
  };
  
  const cornerColor = getCornerColor();
  
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10" aria-hidden="false">
      <div className="relative">
        {/* Smart adaptive overlays */}
        {needsAntiGlare && (
          <div className="absolute inset-0 bg-black/20 rounded-4xl pointer-events-none z-5 transition-opacity duration-300" />
        )}
        
        {needsContrast && (
          <div className="absolute inset-0 bg-white/10 rounded-4xl pointer-events-none z-5 transition-opacity duration-300" />
        )}
        
        {/* Quality-based enhancement overlay */}
        {frameQuality === "poor" && (
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-orange-500/10 rounded-4xl pointer-events-none z-5 animate-pulse" />
        )}

        {/* Main scanner frame with enhanced quality-based feedback */}
        <div className={getFrameStyles()}>
          
          {/* Enhanced scanning line with quality-aware animation */}
          <div className="absolute top-6 left-6 right-6 h-[calc(100%-3rem)] z-10 pointer-events-none">
            <div className="relative w-full h-full">
              {scanStatus === 'scanning' && (
                <>
                  <div className={`absolute left-0 right-0 h-1.5 rounded shadow-lg transition-all duration-300 ${
                    frameQuality === "poor" 
                      ? 'bg-gradient-to-r from-transparent via-red-400 to-transparent animate-[scanline_1.5s_ease-in-out_infinite]'
                      : frameQuality === "fair"
                        ? 'bg-gradient-to-r from-transparent via-yellow-400 to-transparent animate-[scanline_1.8s_ease-in-out_infinite]'
                        : 'bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-[scanline_2s_ease-in-out_infinite]'
                  }`} style={{ top: 0, animationName: 'scanline' }} />
                  
                  {/* Enhanced pulsing edge highlights for quality feedback */}
                  <div className={`absolute inset-0 border-2 rounded-2xl transition-all duration-300 ${
                    frameQuality === "poor" 
                      ? 'border-red-300/60 animate-pulse'
                      : frameQuality === "fair"
                        ? 'border-yellow-300/60 animate-pulse'
                        : 'border-blue-300/50 animate-pulse'
                  }`} />
                </>
              )}
            </div>
          </div>

          {/* Enhanced corner indicators with quality-based styling */}
          <div className={`absolute -top-3 -left-3 w-14 h-14 border-l-8 border-t-8 ${cornerColor} rounded-tl-[2.4rem] shadow-[0_0_8px_2px_rgba(57,106,252,0.4)] transition-all duration-300`} />
          <div className={`absolute -top-3 -right-3 w-14 h-14 border-r-8 border-t-8 ${cornerColor} rounded-tr-[2.4rem] shadow-[0_0_8px_2px_rgba(57,106,252,0.4)] transition-all duration-300`} />
          <div className={`absolute -bottom-3 -left-3 w-14 h-14 border-l-8 border-b-8 ${cornerColor} rounded-bl-[2.4rem] shadow-[0_0_8px_2px_rgba(57,106,252,0.4)] transition-all duration-300`} />
          <div className={`absolute -bottom-3 -right-3 w-14 h-14 border-r-8 border-b-8 ${cornerColor} rounded-br-[2.4rem] shadow-[0_0_8px_2px_rgba(57,106,252,0.4)] transition-all duration-300`} />
          
          {/* Smart dimming overlay with quality adaptation */}
          <div className={`absolute inset-2 rounded-3xl pointer-events-none transition-all duration-500 ${
            frameQuality === "poor" 
              ? 'bg-gradient-to-br from-red-500/10 via-black/10 to-orange-500/10'
              : 'bg-gradient-to-br from-transparent via-black/5 to-transparent'
          }`} />
          
          {/* Real-time quality indicator */}
          {(frameQuality !== "good" || scanAttempts > 1) && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white flex items-center space-x-1 backdrop-blur-sm">
              <div className={`w-2 h-2 rounded-full ${
                frameQuality === "poor" ? 'bg-red-400 animate-pulse' :
                frameQuality === "fair" ? 'bg-yellow-400 animate-pulse' :
                frameQuality === "challenging" ? 'bg-purple-400 animate-pulse' :
                'bg-green-400'
              }`} />
              <span className="capitalize">{frameQuality}</span>
              {scanAttempts > 1 && <span>• {scanAttempts}</span>}
            </div>
          )}
        </div>
        
        {/* Enhanced adaptive spotlight with quality-based adjustments */}
        <div className="absolute inset-0 z-0 pointer-events-none transition-all duration-500" aria-hidden="true">
          <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            <defs>
              <radialGradient id="quality-adaptive-spotlight" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
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
            <rect width="100" height="100" fill="url(#quality-adaptive-spotlight)" />
          </svg>
        </div>
        
        {/* Enhanced environmental and quality status indicators */}
        {(lightLevel || frameQuality !== "good") && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 rounded text-xs text-white flex items-center space-x-1 backdrop-blur-sm">
            {lightLevel && (
              <span>{lightLevel > 600 ? '☀️' : lightLevel < 50 ? '🌙' : '🌤️'}</span>
            )}
            {frameQuality !== "good" && (
              <span className={
                frameQuality === "poor" ? 'text-red-300' :
                frameQuality === "fair" ? 'text-yellow-300' :
                'text-purple-300'
              }>●</span>
            )}
          </div>
        )}

        {/* Enhanced instruction text with quality-aware messaging */}
        <div className="absolute -bottom-16 sm:-bottom-20 left-1/2 transform -translate-x-1/2 w-full flex flex-col gap-1 items-center text-center select-none" aria-live="polite" aria-atomic="true">
          <div className={`glass-panel px-6 py-3 rounded-xl shadow-lg backdrop-blur-md border-white/40 dark:border-white/20 transition-all duration-300 ${
            frameQuality === "poor" 
              ? 'bg-gradient-to-r from-red-500/30 to-orange-500/20 shadow-red-400/20'
              : frameQuality === "fair"
                ? 'bg-gradient-to-r from-yellow-500/25 to-orange-500/15 shadow-yellow-400/15'
                : 'bg-gradient-to-r from-blue-500/20 to-indigo-500/10 shadow-blue-400/10'
          }`}>
            {scanStatus === "success" && scanResult ? (
              <p className="text-blue-100 font-bold text-base sm:text-xl break-all tracking-wider select-text" tabIndex={0} aria-label={"QR scan result: " + scanResult}>
                {scanResult}
              </p>
            ) : (
              <>
                <p className="text-blue-100 text-xs sm:text-base mt-2" aria-label="Position the QR code within the frame">
                  {frameQuality === "poor" ? "Having trouble? Try different lighting or AI processing" :
                   frameQuality === "fair" ? "Keep trying — adjust position or lighting" :
                   needsAntiGlare ? "Move to shade if possible" : 
                   needsContrast ? "Use flashlight for better visibility" : 
                   "Position the QR code within the frame"}
                </p>
                <span className="sr-only">Ready to scan QR Code</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <style>
        {`
          @keyframes scanline {
            0% { top: 4px; opacity: 0.15;}
            12% { opacity: 1;}
            48% { top: calc(100% - 12px); opacity: 0.75;}
            100% { top: 4px; opacity: 0.15;}
          }
        `}
      </style>
    </div>
  );
};

export default QRScannerFrame;
