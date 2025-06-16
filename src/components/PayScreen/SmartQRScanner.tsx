
import React, { useEffect, useState } from "react";
import { useAmbientLightSensor } from "@/hooks/useAmbientLightSensor";
import { useQRScanner } from "@/hooks/useQRScanner";
import { useAIProcessing } from "@/hooks/useAIProcessing";
import { useCameraOptimization } from "@/hooks/useCameraOptimization";
import ScannerStatusDisplay from "./ScannerStatusDisplay";
import FlashlightButton from "./FlashlightButton";
import ScannerOverlay from "./ScannerOverlay";
import ScannerBackButton from "./ScannerBackButton";

interface SmartQRScannerProps {
  onBack: () => void;
}

const SmartQRScanner: React.FC<SmartQRScannerProps> = ({ onBack }) => {
  const [showFlashSuggestion, setShowFlashSuggestion] = useState(false);
  const [showFlashButton, setShowFlashButton] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);

  // Custom hooks
  const { scanStatus, setScanStatus, scanResult, setScanResult, videoRef, handleRetry, handleUSSDLaunch, cameraDevices } = useQRScanner();
  const { isProcessingWithAI, canvasRef, processWithAI } = useAIProcessing();
  const light = useAmbientLightSensor();
  const { cleanup } = useCameraOptimization();

  // Show flash suggestion if low light
  useEffect(() => {
    setShowFlashSuggestion(typeof light === "number" && light < 16);
    setShowFlashButton(typeof light === "number" && light < 60);
  }, [light]);

  // Cleanup camera resources on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const handleProcessWithAI = () => {
    processWithAI(videoRef, setScanResult, setScanStatus);
  };

  const handleFlashToggle = (enabled: boolean) => {
    setFlashEnabled(enabled);
  };

  return (
    <div
      className="absolute inset-0 flex flex-col w-full h-full items-center justify-start z-50"
      role="region"
      aria-label="Rwanda MoMo QR scanner, align QR code within the frame"
      tabIndex={-1}
    >
      {/* HTML5 QR Code Scanner Container - This is where html5-qrcode will mount */}
      <div 
        id="reader" 
        className="absolute inset-0 w-full h-full object-cover bg-black"
        aria-label="QR Code Scanner"
      />
      
      {/* Hidden video element for compatibility */}
      <video
        ref={videoRef}
        className="hidden"
        aria-label="Camera stream"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Scanner overlay with scanning frame and tips */}
      <ScannerOverlay
        scanStatus={scanStatus}
        scanResult={scanResult}
        canvasRef={canvasRef}
      />
      
      {/* Flashlight toggle (top right) */}
      <FlashlightButton
        showFlashButton={showFlashButton}
        flashEnabled={flashEnabled}
        videoRef={videoRef}
        onFlashToggle={handleFlashToggle}
      />
      
      {/* Status displays */}
      <ScannerStatusDisplay
        scanStatus={scanStatus}
        scanResult={scanResult}
        isProcessingWithAI={isProcessingWithAI}
        onRetry={handleRetry}
        onProcessWithAI={handleProcessWithAI}
        onUSSDLaunch={handleUSSDLaunch}
      />
      
      {/* Back button (top left) */}
      <ScannerBackButton onBack={onBack} />
      
      {/* Camera devices debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && cameraDevices.length > 0 && (
        <div className="absolute top-20 left-4 bg-black/80 text-white p-2 rounded text-xs">
          Cameras: {cameraDevices.length}
        </div>
      )}
    </div>
  );
};

export default SmartQRScanner;
