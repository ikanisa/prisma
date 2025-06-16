
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

  // Enhanced flash suggestion logic based on light conditions
  useEffect(() => {
    if (typeof light === "number") {
      // Show flash suggestion for very low light (< 20 lux)
      setShowFlashSuggestion(light < 20);
      // Show flash button for moderately low light (< 80 lux)
      setShowFlashButton(light < 80);
      
      console.log(`[Light Adaptation] Light level: ${light} lux, Flash suggestion: ${light < 20}, Flash button: ${light < 80}`);
    }
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
      {/* HTML5 QR Code Scanner Container */}
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
      
      {/* Enhanced scanner overlay with environmental adaptation */}
      <ScannerOverlay
        scanStatus={scanStatus}
        scanResult={scanResult}
        canvasRef={canvasRef}
      />
      
      {/* Enhanced flashlight toggle with environmental triggers */}
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
      
      {/* Back button */}
      <ScannerBackButton onBack={onBack} />
      
      {/* Environmental debug info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-20 left-4 bg-black/80 text-white p-2 rounded text-xs space-y-1">
          <div>Light: {light ? `${light} lux` : 'N/A'}</div>
          <div>Cameras: {cameraDevices.length}</div>
          <div>Flash: {flashEnabled ? 'ON' : 'OFF'}</div>
        </div>
      )}
    </div>
  );
};

export default SmartQRScanner;
