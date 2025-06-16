
import React from 'react';

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

interface QRScannerFrameProps {
  scanStatus?: ScanStatus;
  scanResult?: string | null;
  shimmer?: boolean;
  lightLevel?: number | null;
}

const QRScannerFrame: React.FC<QRScannerFrameProps> = ({
  scanStatus,
  scanResult,
  shimmer,
  lightLevel
}) => {
  // Determine if we need anti-glare overlay based on light level
  const needsAntiGlare = lightLevel && lightLevel > 600;
  const needsContrast = lightLevel && lightLevel < 50;
  
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10" aria-hidden="false">
      <div className="relative">
        {/* Anti-glare overlay for bright conditions */}
        {needsAntiGlare && (
          <div className="absolute inset-0 bg-black/20 rounded-4xl pointer-events-none z-5" />
        )}
        
        {/* Contrast enhancement for low light */}
        {needsContrast && (
          <div className="absolute inset-0 bg-white/10 rounded-4xl pointer-events-none z-5" />
        )}

        {/* Main scanner frame with enhanced glassmorphism and adaptive glow */}
        <div className={`relative w-72 h-72 xs:w-80 xs:h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] lg:w-[32rem] lg:h-[32rem] rounded-4xl backdrop-blur-4xl bg-white/10 dark:bg-black/30 border-4 border-white/25 shadow-2xl ring-4 ring-blue-400/30 qr-glow overflow-hidden ${shimmer ? 'animate-pulse' : ''}`}>
          
          {/* Enhanced scanning line with pulsing effect */}
          <div className="absolute top-6 left-6 right-6 h-[calc(100%-3rem)] z-10 pointer-events-none">
            <div className="relative w-full h-full">
              <div className={`absolute left-0 right-0 h-1.5 rounded bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-lg ${scanStatus === 'scanning' ? 'animate-[scanline_2s_ease-in-out_infinite]' : 'opacity-0'}`} style={{
                top: 0,
                animationName: 'scanline'
              }} />
              
              {/* Pulsing edge highlights for better visibility */}
              {scanStatus === 'scanning' && (
                <div className="absolute inset-0 border-2 border-blue-300/50 rounded-2xl animate-pulse" />
              )}
            </div>
          </div>

          {/* Enhanced corner indicators with adaptive brightness */}
          <div className={`absolute -top-3 -left-3 w-14 h-14 border-l-8 border-t-8 ${needsAntiGlare ? 'border-yellow-400/90' : 'border-blue-400/90'} rounded-tl-[2.4rem] shadow-[0_0_8px_2px_rgba(57,106,252,0.4)]`} />
          <div className={`absolute -top-3 -right-3 w-14 h-14 border-r-8 border-t-8 ${needsAntiGlare ? 'border-yellow-400/90' : 'border-blue-400/90'} rounded-tr-[2.4rem] shadow-[0_0_8px_2px_rgba(57,106,252,0.4)]`} />
          <div className={`absolute -bottom-3 -left-3 w-14 h-14 border-l-8 border-b-8 ${needsAntiGlare ? 'border-yellow-400/90' : 'border-blue-400/90'} rounded-bl-[2.4rem] shadow-[0_0_8px_2px_rgba(57,106,252,0.4)]`} />
          <div className={`absolute -bottom-3 -right-3 w-14 h-14 border-r-8 border-b-8 ${needsAntiGlare ? 'border-yellow-400/90' : 'border-blue-400/90'} rounded-br-[2.4rem] shadow-[0_0_8px_2px_rgba(57,106,252,0.4)]`} />
          
          {/* Smart dimming overlay around scan zone */}
          <div className="absolute inset-2 rounded-3xl bg-gradient-to-br from-transparent via-black/5 to-transparent pointer-events-none" />
        </div>
        
        {/* Enhanced spotlight overlay with environmental adaptation */}
        <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
          <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            <defs>
              <radialGradient id="adaptive-spotlight" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="67%" stopColor="rgba(20,22,50,0)" />
                <stop offset="81%" stopColor={needsAntiGlare ? "rgba(0,0,0,0.6)" : "rgba(13,15,30,0.38)"} />
                <stop offset="100%" stopColor={needsAntiGlare ? "rgba(0,0,0,0.85)" : "rgba(13,15,30,0.82)"} />
              </radialGradient>
            </defs>
            <rect width="100" height="100" fill="url(#adaptive-spotlight)" />
          </svg>
        </div>
        
        {/* Environmental status indicator */}
        {lightLevel && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
            {lightLevel > 600 ? '☀️' : lightLevel < 50 ? '🌙' : '🌤️'}
          </div>
        )}

        {/* Enhanced instruction text with environmental context */}
        <div className="absolute -bottom-16 sm:-bottom-20 left-1/2 transform -translate-x-1/2 w-full flex flex-col gap-1 items-center text-center select-none" aria-live="polite" aria-atomic="true">
          <div className="glass-panel px-6 py-3 rounded-xl shadow-lg shadow-blue-400/10 bg-gradient-to-r from-blue-500/20 to-indigo-500/10 backdrop-blur-md border-white/40 dark:border-white/20 transition-all duration-150">
            {scanStatus === "success" && scanResult ? (
              <p className="text-blue-100 font-bold text-base sm:text-xl break-all tracking-wider select-text" tabIndex={0} aria-label={"QR scan result: " + scanResult}>
                {scanResult}
              </p>
            ) : (
              <>
                <p className="text-blue-100 text-xs sm:text-base mt-2" aria-label="Position the QR code within the frame">
                  {needsAntiGlare ? "Move to shade if possible" : needsContrast ? "Use flashlight for better visibility" : "Position the QR code within the frame"}
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
