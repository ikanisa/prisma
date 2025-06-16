
import React from 'react';

interface ScannerInstructionsProps {
  scanStatus?: string;
  scanResult?: string | null;
  frameQuality: string;
  needsAntiGlare: boolean;
  needsContrast: boolean;
  performanceConfig?: {
    enableShadows: boolean;
    enableBlur: boolean;
    enableAnimations: boolean;
  };
}

const ScannerInstructions: React.FC<ScannerInstructionsProps> = ({
  scanStatus,
  scanResult,
  frameQuality,
  needsAntiGlare,
  needsContrast,
  performanceConfig
}) => {
  const shadowClass = performanceConfig?.enableShadows ? 'shadow-lg' : 'shadow-md';
  const blurClass = performanceConfig?.enableBlur ? 'backdrop-blur-md' : 'backdrop-blur-sm';
  const transitionClass = performanceConfig?.enableAnimations ? 'transition-all duration-300' : '';
  
  const backgroundClass = frameQuality === "poor" 
    ? 'bg-gradient-to-r from-red-500/30 to-orange-500/20 shadow-red-400/20'
    : frameQuality === "fair"
      ? 'bg-gradient-to-r from-yellow-500/25 to-orange-500/15 shadow-yellow-400/15'
      : 'bg-gradient-to-r from-blue-500/20 to-indigo-500/10 shadow-blue-400/10';

  return (
    <div className="absolute -bottom-16 sm:-bottom-20 left-1/2 transform -translate-x-1/2 w-full flex flex-col gap-1 items-center text-center select-none" aria-live="polite" aria-atomic="true">
      <div className={`glass-panel px-6 py-3 rounded-xl ${shadowClass} ${blurClass} border-white/40 dark:border-white/20 ${transitionClass} ${backgroundClass}`}>
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
  );
};

export default ScannerInstructions;
