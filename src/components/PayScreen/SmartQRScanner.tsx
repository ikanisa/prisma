
import React, { useEffect, useState } from "react";
import QRScannerFrame from "./QRScannerFrame";
import { useAmbientLightSensor } from "@/hooks/useAmbientLightSensor";
import { useQRScanner } from "@/hooks/useQRScanner";
import { useAIProcessing } from "@/hooks/useAIProcessing";
import ScannerStatusDisplay from "./ScannerStatusDisplay";
import FlashlightSuggestion from "./FlashlightSuggestion";
import { toast } from "@/hooks/use-toast";
import { Flashlight, FlashlightOff, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SCAN_BOX_SIZE = "min(84vw, 80vh)";

interface SmartQRScannerProps {
  onBack: () => void;
}

const holdTips = [
  "Hold steady, scanning for Rwanda MoMo QR...",
  "Move closer to sharpen focus",
  "Ensure good lighting for best results",
];

const SmartQRScanner: React.FC<SmartQRScannerProps> = ({ onBack }) => {
  const [showFlashSuggestion, setShowFlashSuggestion] = useState(false);
  const [showFlashButton, setShowFlashButton] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [showTip, setShowTip] = useState(holdTips[0]);
  const [tipIdx, setTipIdx] = useState(0);
  const [shimmer, setShimmer] = useState(false);
  const navigate = useNavigate();

  // Custom hooks
  const { scanStatus, setScanStatus, scanResult, setScanResult, videoRef, handleRetry, handleUSSDLaunch } = useQRScanner();
  const { isProcessingWithAI, canvasRef, processWithAI } = useAIProcessing();
  const light = useAmbientLightSensor();

  // Show flash suggestion if low light
  useEffect(() => {
    setShowFlashSuggestion(typeof light === "number" && light < 16);
    setShowFlashButton(typeof light === "number" && light < 60);
  }, [light]);

  // Cycling smart tips based on scan status
  useEffect(() => {
    let tipCycle: NodeJS.Timeout | null = null;
    setShowTip(holdTips[0]);
    setTipIdx(0);
    if (scanStatus === "scanning") {
      tipCycle = setInterval(() => {
        setTipIdx((idx) => {
          const next = (idx + 1) % holdTips.length;
          setShowTip(holdTips[next]);
          return next;
        });
      }, 3400);
    } else if (scanStatus === "fail") {
      setShowTip("QR not detected — try moving closer or better lighting");
    } else if (scanStatus === "processing") {
      setShowTip("Decoding with AI – one moment…");
    } else if (scanStatus === "idle") {
      setShowTip("Align QR within frame to begin");
    } else if (scanStatus === "success") {
      setShowTip("Rwanda MoMo QR detected! Ready to launch payment");
    }
    return () => {
      if (tipCycle) clearInterval(tipCycle);
    }
  }, [scanStatus]);

  // Shimmer effect on scan box during scanning
  useEffect(() => {
    setShimmer(scanStatus === "scanning" || scanStatus === "processing");
  }, [scanStatus]);

  // Flashlight toggling
  const handleToggleFlash = async () => {
    try {
      const { CameraService } = await import('@/services/CameraService');
      const success = await CameraService.toggleFlash(videoRef, flashEnabled);
      setFlashEnabled(success);
      toast({
        title: success ? "Flashlight enabled" : "Flashlight disabled",
        description: "Camera flash turned " + (success ? "on" : "off"),
      });
    } catch {
      toast({
        title: "Flash not supported",
        description: "This device/browser does not support torch control.",
        variant: "destructive"
      });
      setFlashEnabled(false);
    }
  };

  const handleProcessWithAI = () => {
    processWithAI(videoRef, setScanResult, setScanStatus);
  };

  return (
    <div
      className="absolute inset-0 flex flex-col w-full h-full items-center justify-start z-50"
      role="region"
      aria-label="Rwanda MoMo QR scanner, align QR code within the frame"
      tabIndex={-1}
    >
      {/* Camera background */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover bg-black"
        aria-label="Camera stream"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Dimmed glass overlay */}
      <div className="absolute inset-0 bg-black/80 pointer-events-none" />
      
      {/* Scan overlay */}
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
          {/* Scan box + shimmer */}
          <QRScannerFrame scanStatus={scanStatus} scanResult={scanResult} shimmer={shimmer} />
          
          {/* Pulsing background on scan */}
          {(scanStatus === "scanning" || scanStatus === "processing") && (
            <div className="absolute inset-0 rounded-4xl animate-pulse bg-gradient-to-br from-blue-500/10 via-blue-700/10 to-indigo-500/10 shadow-[0_0_0_8px_rgba(57,106,252,0.12)] pointer-events-none" />
          )}
          <div className="absolute inset-0 rounded-4xl bg-white/6 backdrop-blur-[4px] shadow-inner pointer-events-none" />
        </div>
        
        {/* Smart tip overlay at bottom of frame */}
        <div className="mt-6 mb-2 flex flex-col items-center justify-center pointer-events-none">
          <div
            className="glass-panel px-5 py-2 rounded-full shadow-md text-center text-sm md:text-base bg-gradient-to-r from-blue-700/20 to-indigo-400/20 text-blue-100 font-semibold"
            aria-live="polite"
          >
            {showTip}
          </div>
        </div>
      </div>
      
      {/* Flashlight toggle (top right) */}
      {showFlashButton && (
        <button
          className={`absolute top-5 right-5 z-50 flex items-center gap-2 px-4 py-2 font-semibold rounded-full bg-yellow-100/90 shadow-lg border border-yellow-300 text-blue-900 backdrop-blur-lg hover:bg-yellow-200 focus-visible:ring-2 focus-visible:ring-yellow-500 transition active:scale-95`}
          onClick={handleToggleFlash}
          aria-label={flashEnabled ? "Disable flashlight" : "Enable flashlight"}
          tabIndex={0}
        >
          {flashEnabled ? (
            <FlashlightOff className="w-5 h-5" />
          ) : (
            <Flashlight className="w-5 h-5" />
          )}
          {flashEnabled ? "Flash On" : "Flash"}
        </button>
      )}
      
      {/* Status displays */}
      <ScannerStatusDisplay
        scanStatus={scanStatus}
        scanResult={scanResult}
        isProcessingWithAI={isProcessingWithAI}
        onRetry={handleRetry}
        onProcessWithAI={handleProcessWithAI}
        onUSSDPress={handleUSSDLaunch}
      />
      
      {/* Back button (top left) */}
      <button
        className="absolute top-4 left-4 z-50 glass-card p-2 rounded-2xl text-white shadow-xl bg-black/30 hover:scale-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 transition-all"
        aria-label="Back to home screen"
        onClick={() => navigate("/")}
        tabIndex={0}
      >
        <X className="w-8 h-8" />
        <span className="sr-only">Back</span>
      </button>
    </div>
  );
};

export default SmartQRScanner;
