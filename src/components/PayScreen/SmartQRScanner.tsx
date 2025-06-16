import React, { useEffect, useState, useCallback } from "react";
import { useAmbientLightSensor } from "@/hooks/useAmbientLightSensor";
import { useQRScanner } from "@/hooks/useQRScanner";
import { useAIProcessing } from "@/hooks/useAIProcessing";
import { useCameraOptimization } from "@/hooks/useCameraOptimization";
import { usePerformanceOptimization } from "@/hooks/usePerformanceOptimization";
import ScannerStatusDisplay from "./ScannerStatusDisplay";
import FlashlightButton from "./FlashlightButton";
import ScannerOverlay from "./ScannerOverlay";
import ScannerBackButton from "./ScannerBackButton";
interface SmartQRScannerProps {
  onBack: () => void;
}
const SmartQRScanner: React.FC<SmartQRScannerProps> = ({
  onBack
}) => {
  const [showFlashSuggestion, setShowFlashSuggestion] = useState(false);
  const [showFlashButton, setShowFlashButton] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);

  // Enhanced hooks with performance tracking
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
  const {
    isProcessingWithAI,
    canvasRef,
    processWithAI
  } = useAIProcessing();
  const light = useAmbientLightSensor();
  const {
    cleanup
  } = useCameraOptimization();
  const {
    metrics,
    performMemoryCleanup,
    isLowPerformanceDevice,
    optimalConfig
  } = usePerformanceOptimization();

  // Enhanced flash suggestion logic with performance considerations
  useEffect(() => {
    if (typeof light === "number") {
      const persistentFailure = scanAttempts >= 2 && scanDuration > 5000;
      setShowFlashSuggestion(light < 20 || light < 80 && persistentFailure);
      setShowFlashButton(light < 80 || light < 150 && scanAttempts >= 1);
      console.log(`[Light Adaptation] Light: ${light} lux, Attempts: ${scanAttempts}, Duration: ${scanDuration}ms, Flash suggestion: ${light < 20 || persistentFailure}, Flash button: ${light < 80 || light < 150 && scanAttempts >= 1}`);
    }
  }, [light, scanAttempts, scanDuration]);

  // Performance-aware memory cleanup
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (metrics.memoryUsage > 70) {
        console.log('[Performance] High memory usage detected, performing cleanup');
        performMemoryCleanup();
      }
    }, 10000);
    return () => clearInterval(cleanupInterval);
  }, [metrics.memoryUsage, performMemoryCleanup]);

  // Optimized cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      performMemoryCleanup();
    };
  }, [cleanup, performMemoryCleanup]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleProcessWithAI = useCallback(() => {
    processWithAI(videoRef, setScanResult, setScanStatus);
  }, [processWithAI, videoRef, setScanResult, setScanStatus]);
  const handleFlashToggle = useCallback((enabled: boolean) => {
    setFlashEnabled(enabled);
  }, []);
  return <div className="absolute inset-0 flex flex-col w-full h-full items-center justify-start z-50" role="region" aria-label="Rwanda MoMo QR scanner with intelligent guidance, align QR code within the frame" tabIndex={-1}>
      {/* HTML5 QR Code Scanner Container with performance optimization */}
      <div id="reader" className="absolute inset-0 w-full h-full object-cover bg-black" aria-label="QR Code Scanner" style={{
      // Reduce GPU layers on low-performance devices
      willChange: isLowPerformanceDevice ? 'auto' : 'transform',
      transform: isLowPerformanceDevice ? 'none' : 'translate3d(0,0,0)'
    }} />
      
      {/* Hidden video element for compatibility */}
      <video ref={videoRef} className="hidden" aria-label="Camera stream" />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Performance-optimized scanner overlay */}
      <ScannerOverlay scanStatus={scanStatus} scanResult={scanResult} canvasRef={canvasRef} scanAttempts={scanAttempts} scanDuration={scanDuration} performanceConfig={optimalConfig} />
      
      {/* Optimized flashlight toggle */}
      <FlashlightButton showFlashButton={showFlashButton} flashEnabled={flashEnabled} videoRef={videoRef} onFlashToggle={handleFlashToggle} />
      
      {/* Status displays with reduced animations on low-performance devices */}
      <ScannerStatusDisplay scanStatus={scanStatus} scanResult={scanResult} isProcessingWithAI={isProcessingWithAI} onRetry={handleRetry} onProcessWithAI={handleProcessWithAI} onUSSDLaunch={handleUSSDLaunch} reduceAnimations={isLowPerformanceDevice} />
      
      {/* Back button */}
      <ScannerBackButton onBack={onBack} />
      
      {/* Enhanced performance debug info (development only) */}
      {process.env.NODE_ENV === 'development'}
    </div>;
};
export default SmartQRScanner;