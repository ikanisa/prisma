
import React, { useEffect, useState } from "react";
import QRScannerFrame from "./QRScannerFrame";
import { useAmbientLightSensor } from "@/hooks/useAmbientLightSensor";
import { useQRScanner } from "@/hooks/useQRScanner";
import { useAIProcessing } from "@/hooks/useAIProcessing";
import ScannerStatusDisplay from "./ScannerStatusDisplay";
import FlashlightSuggestion from "./FlashlightSuggestion";
import { toast } from "@/hooks/use-toast";

const SCAN_BOX_SIZE = "min(84vw, 80vh)";

interface SmartQRScannerProps {
  onBack: () => void;
}

const SmartQRScanner: React.FC<SmartQRScannerProps> = ({ onBack }) => {
  const [showFlashSuggestion, setShowFlashSuggestion] = useState(false);
  
  // Custom hooks
  const { scanStatus, setScanStatus, scanResult, setScanResult, videoRef, handleRetry } = useQRScanner();
  const { isProcessingWithAI, canvasRef, processWithAI } = useAIProcessing();
  const light = useAmbientLightSensor();

  // Show flash suggestion if low light
  useEffect(() => {
    setShowFlashSuggestion(typeof light === "number" && light < 16);
  }, [light]);

  const handleProcessWithAI = () => {
    processWithAI(videoRef, setScanResult, setScanStatus);
  };

  const handleUSSDPress = () => {
    if (!scanResult) return;
    navigator.clipboard.writeText(scanResult);
    if ("vibrate" in navigator) navigator.vibrate([50, 40, 65]);
    toast({
      title: "Copied!",
      description: "USSD code copied to clipboard",
    });
  };

  return (
    <div className="absolute inset-0 flex flex-col w-full h-full items-center justify-start z-50">
      {/* Camera background */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover bg-black"
        aria-label="Camera Stream"
      />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute inset-0 bg-black/80 pointer-events-none" />

      {/* Animated scan box */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: SCAN_BOX_SIZE,
          height: SCAN_BOX_SIZE,
          maxWidth: 370,
          maxHeight: 370,
        }}
      >
        <div className="relative w-full h-full">
          <div className="absolute inset-0 z-10">
            <QRScannerFrame scanStatus={scanStatus} scanResult={scanResult} />
            {/* Animated pulse - scanning */}
            {(scanStatus === "scanning" || scanStatus === "processing") && (
              <div className="absolute inset-0 rounded-4xl animate-pulse bg-gradient-to-br from-blue-500/10 via-blue-700/10 to-indigo-500/10 shadow-[0_0_0_8px_rgba(57,106,252,0.12)] pointer-events-none" />
            )}
            <div className="absolute inset-0 rounded-4xl bg-white/6 backdrop-blur-[4px] shadow-inner pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Status displays */}
      <ScannerStatusDisplay
        scanStatus={scanStatus}
        scanResult={scanResult}
        isProcessingWithAI={isProcessingWithAI}
        onRetry={handleRetry}
        onProcessWithAI={handleProcessWithAI}
        onUSSDPress={handleUSSDPress}
      />

      {/* Flashlight suggestion */}
      <FlashlightSuggestion showFlashSuggestion={showFlashSuggestion} />

      {/* Back button */}
      <button
        className="absolute top-4 left-4 z-50 glass-card p-2 rounded-2xl text-white shadow-xl bg-black/30 hover:scale-110 transition-all"
        aria-label="Back to previous screen"
        onClick={onBack}
      >
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    </div>
  );
};

export default SmartQRScanner;
