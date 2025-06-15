import React from 'react';

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

interface QRScannerFrameProps {
  scanStatus?: ScanStatus;
  scanResult?: string | null;
  shimmer?: boolean;
}

const QRScannerFrame: React.FC<QRScannerFrameProps> = ({
  scanStatus,
  scanResult,
  shimmer
}) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10" aria-hidden="false">
      <div className="relative">
        {/* Main scanner frame with glassmorphism, rounded corners, and accent glow */}
        {/* Optionally, you could use `shimmer` prop for a className or visual effect here */}
        <div className="relative w-72 h-72 xs:w-80 xs:h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] lg:w-[32rem] lg:h-[32rem] rounded-4xl backdrop-blur-4xl bg-white/10 dark:bg-black/30 border-4 border-white/25 shadow-2xl ring-4 ring-blue-400/30 qr-glow overflow-hidden">
          {/* Animated scanning line */}
          <div className="absolute top-6 left-6 right-6 h-[calc(100%-3rem)] z-10 pointer-events-none">
            <div className="relative w-full h-full">
              <div className="absolute left-0 right-0 h-1.5 rounded bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-[scanline_2s_ease-in-out_infinite] shadow-lg" style={{
                top: 0,
                animationName: 'scanline'
              }} />
            </div>
          </div>
          {/* Custom corner indicators with accent glow */}
          <div className="absolute -top-3 -left-3 w-14 h-14 border-l-8 border-t-8 border-blue-400/90 rounded-tl-[2.4rem] shadow-[0_0_8px_2px_rgba(57,106,252,0.4)]" />
          <div className="absolute -top-3 -right-3 w-14 h-14 border-r-8 border-t-8 border-blue-400/90 rounded-tr-[2.4rem] shadow-[0_0_8px_2px_rgba(57,106,252,0.4)]" />
          <div className="absolute -bottom-3 -left-3 w-14 h-14 border-l-8 border-b-8 border-blue-400/90 rounded-bl-[2.4rem] shadow-[0_0_8px_2px_rgba(57,106,252,0.4)]" />
          <div className="absolute -bottom-3 -right-3 w-14 h-14 border-r-8 border-b-8 border-blue-400/90 rounded-br-[2.4rem] shadow-[0_0_8px_2px_rgba(57,106,252,0.4)]" />
        </div>
        {/* Spotlight overlay (outside the frame) */}
        <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
          <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            <defs>
              <radialGradient id="spotlight" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="67%" stopColor="rgba(20,22,50,0)" />
                <stop offset="81%" stopColor="rgba(13,15,30,0.38)" />
                <stop offset="100%" stopColor="rgba(13,15,30,0.82)" />
              </radialGradient>
            </defs>
            <rect width="100" height="100" fill="url(#spotlight)" />
          </svg>
        </div>
        {/* Upgraded instruction text / USSD code display */}
        <div className="absolute -bottom-16 sm:-bottom-20 left-1/2 transform -translate-x-1/2 w-full flex flex-col gap-1 items-center text-center select-none" aria-live="polite" aria-atomic="true">
          <div className="glass-panel px-6 py-3 rounded-xl shadow-lg shadow-blue-400/10 bg-gradient-to-r from-blue-500/20 to-indigo-500/10 backdrop-blur-md border-white/40 dark:border-white/20 transition-all duration-150">
            {scanStatus === "success" && scanResult ? (
              <p className="text-blue-100 font-bold text-base sm:text-xl break-all tracking-wider select-text" tabIndex={0} aria-label={"QR scan result: " + scanResult}>
                {scanResult}
              </p>
            ) : (
              <>
                <p className="text-blue-100 text-xs sm:text-base mt-2" aria-label="Position the QR code within the frame">
                  Position the QR code within the frame
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
