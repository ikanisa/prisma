
import React, { useMemo } from 'react';

interface SimpleScannerFrameProps {
  scanStatus: string;
  scanResult?: string | null;
  scanAttempts: number;
  scanDuration: number;
  lightLevel?: number | null;
}

const SimpleScannerFrame: React.FC<SimpleScannerFrameProps> = ({
  scanStatus,
  scanResult,
  scanAttempts,
  scanDuration,
  lightLevel
}) => {
  const frameQuality = useMemo(() => {
    if (scanDuration > 7000 && scanAttempts >= 3) return "poor";
    if (scanDuration > 4000 && scanAttempts >= 2) return "fair";
    if (lightLevel && (lightLevel < 20 || lightLevel > 800)) return "challenging";
    return "good";
  }, [scanDuration, scanAttempts, lightLevel]);

  const frameStyles = useMemo(() => {
    const baseStyles = "relative w-72 h-72 sm:w-96 sm:h-96 lg:w-[32rem] lg:h-[32rem] rounded-4xl border-4 ring-4 overflow-hidden transition-all duration-500";
    
    if (frameQuality === "poor") {
      return `${baseStyles} bg-red-500/20 border-red-400/40 ring-red-400/50 shadow-[0_0_40px_rgba(239,68,68,0.4)]`;
    }
    if (frameQuality === "fair") {
      return `${baseStyles} bg-yellow-500/15 border-yellow-400/35 ring-yellow-400/40 shadow-[0_0_30px_rgba(245,158,11,0.3)]`;
    }
    return `${baseStyles} bg-white/10 border-white/25 ring-blue-400/30 backdrop-blur-md shadow-2xl`;
  }, [frameQuality]);

  const cornerColor = useMemo(() => {
    if (frameQuality === "poor") return "border-red-400/90";
    if (frameQuality === "fair") return "border-yellow-400/90";
    return "border-blue-400/90";
  }, [frameQuality]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="relative">
        <div className={frameStyles}>
          {/* Scanning line */}
          {scanStatus === 'scanning' && (
            <div className="absolute top-6 left-6 right-6 h-[calc(100%-3rem)] z-10">
              <div 
                className={`absolute left-0 right-0 h-1.5 rounded shadow-lg bg-gradient-to-r from-transparent ${
                  frameQuality === "poor" ? 'via-red-400' : 
                  frameQuality === "fair" ? 'via-yellow-400' : 'via-blue-400'
                } to-transparent`}
                style={{ 
                  top: 0, 
                  animation: 'scanline 1.5s ease-in-out infinite'
                }} 
              />
            </div>
          )}

          {/* Corner indicators */}
          <div className={`absolute -top-3 -left-3 w-14 h-14 border-l-8 border-t-8 ${cornerColor} rounded-tl-[2.4rem] transition-all duration-300`} />
          <div className={`absolute -top-3 -right-3 w-14 h-14 border-r-8 border-t-8 ${cornerColor} rounded-tr-[2.4rem] transition-all duration-300`} />
          <div className={`absolute -bottom-3 -left-3 w-14 h-14 border-l-8 border-b-8 ${cornerColor} rounded-bl-[2.4rem] transition-all duration-300`} />
          <div className={`absolute -bottom-3 -right-3 w-14 h-14 border-r-8 border-b-8 ${cornerColor} rounded-br-[2.4rem] transition-all duration-300`} />

          {/* Quality indicator */}
          {frameQuality !== "good" && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                frameQuality === "poor" ? 'bg-red-400' : 'bg-yellow-400'
              } animate-pulse`} />
              <span className="capitalize">{frameQuality}</span>
              {scanAttempts > 1 && <span>• {scanAttempts}</span>}
            </div>
          )}
        </div>
        
        {/* Instructions */}
        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 w-full text-center">
          <div className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500/20 to-indigo-500/10 backdrop-blur-md border border-white/40 shadow-lg">
            {scanStatus === "success" && scanResult ? (
              <p className="text-blue-100 font-bold text-base break-all">{scanResult}</p>
            ) : (
              <p className="text-blue-100 text-sm">
                {frameQuality === "poor" ? "Having trouble? Try different lighting" :
                 frameQuality === "fair" ? "Keep trying — adjust position or lighting" :
                 lightLevel && lightLevel > 600 ? "Move to shade if possible" : 
                 lightLevel && lightLevel < 50 ? "Use flashlight for better visibility" : 
                 "Position the QR code within the frame"}
              </p>
            )}
          </div>
        </div>

        {/* Spotlight overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            <defs>
              <radialGradient id="spotlight" cx="50%" cy="50%" r="50%">
                <stop offset="67%" stopColor="rgba(20,22,50,0)" />
                <stop offset="81%" stopColor="rgba(13,15,30,0.6)" />
                <stop offset="100%" stopColor="rgba(13,15,30,0.85)" />
              </radialGradient>
            </defs>
            <rect width="100" height="100" fill="url(#spotlight)" />
          </svg>
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

export default SimpleScannerFrame;
