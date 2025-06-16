
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

  // Custom hooks with enhanced tracking
  const { 
    scanStatus, 
    setScanStatus, 
    scanResult, 
    setScanResult, 
    scanAttempts, 
    scanDuration, 
    videoRef, 
    handleRetry, 
    handleUSSDLaunch, 
    cameraDevices 
  } = useQRScanner();
  
  const { isProcessingWithAI, canvasRef, processWithAI } = useAIProcessing();
  const light = useAmbientLightSensor();
  const { cleanup } = useCameraOptimization();

  // Enhanced flash suggestion logic based on light conditions and scan persistence
  useEffect(() => {
    if (typeof light === "number") {
      // Show flash suggestion for very low light (< 20 lux) or after persistent failures
      const persistentFailure = scanAttempts >= 2 && scanDuration > 5000;
      setShowFlashSuggestion(light < 20 || (light < 80 && persistentFailure));
      
      // Show flash button for moderately low light (< 80 lux) or any failure in dim conditions
      setShowFlashButton(light < 80 || (light < 150 && scanAttempts >= 1));
      
      console.log(`[Light Adaptation] Light: ${light} lux, Attempts: ${scanAttempts}, Duration: ${scanDuration}ms, Flash suggestion: ${light < 20 || persistentFailure}, Flash button: ${light < 80 || (light < 150 && scanAttempts >= 1)}`);
    }
  }, [light, scanAttempts, scanDuration]);

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
      aria-label="Rwanda MoMo QR scanner with intelligent guidance, align QR code within the frame"
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
      
      {/* Enhanced scanner overlay with environmental adaptation and tracking data */}
      <ScannerOverlay
        scanStatus={scanStatus}
        scanResult={scanResult}
        canvasRef={canvasRef}
        scanAttempts={scanAttempts}
        scanDuration={scanDuration}
      />
      
      {/* Enhanced flashlight toggle with intelligent triggers */}
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
      
      {/* Enhanced environmental debug info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-20 left-4 bg-black/80 text-white p-2 rounded text-xs space-y-1">
          <div>Light: {light ? `${light} lux` : 'N/A'}</div>
          <div>Cameras: {cameraDevices.length}</div>
          <div>Flash: {flashEnabled ? 'ON' : 'OFF'}</div>
          <div>Attempts: {scanAttempts}</div>
          <div>Duration: {Math.round(scanDuration/1000)}s</div>
          <div className={scanDuration > 7000 ? 'text-red-300' : ''}>
            {scanDuration > 7000 ? '⚠️ Guidance mode' : '🔍 Active scan'}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartQRScanner;
