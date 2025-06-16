
import React, { useState, useCallback } from "react";
import { useSmartQRScanner } from "@/hooks/useSmartQRScanner";
import { useAudioFeedback } from "@/hooks/useAudioFeedback";
import ScannerStatusDisplay from "./ScannerStatusDisplay";
import FlashlightButton from "./FlashlightButton";
import ScannerOverlay from "./ScannerOverlay";
import ScannerBackButton from "./ScannerBackButton";
import ManualQRInput from "./ManualQRInput";

interface SmartQRScannerProps {
  onBack: () => void;
}

const SmartQRScanner: React.FC<SmartQRScannerProps> = ({ onBack }) => {
  const [showManualInput, setShowManualInput] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);

  const {
    scanStatus,
    setScanStatus,
    scanResult,
    scanAttempts,
    scanDuration,
    lightLevel,
    showFlash,
    retryScanning,
    stopScanner
  } = useSmartQRScanner();

  const {
    playSuccessBeep,
    playFailureSound,
    cleanup: cleanupAudio
  } = useAudioFeedback({
    enableScanBeep: true,
    enableFailureSound: true,
    volume: 0.2
  });

  // Audio feedback
  React.useEffect(() => {
    if (scanStatus === 'success' && scanResult) {
      playSuccessBeep();
    } else if (scanStatus === 'fail') {
      playFailureSound();
    }
  }, [scanStatus, scanResult, playSuccessBeep, playFailureSound]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopScanner();
      cleanupAudio();
    };
  }, [stopScanner, cleanupAudio]);

  const handleFlashToggle = useCallback((enabled: boolean) => {
    setFlashEnabled(enabled);
  }, []);

  const handleUSSDLaunch = useCallback(() => {
    if (scanResult) {
      const telUri = `tel:${encodeURIComponent(scanResult)}`;
      window.location.href = telUri;
    }
  }, [scanResult]);

  const handleManualQRSubmit = useCallback((qrData: string) => {
    setScanStatus('success');
    setShowManualInput(false);
    playSuccessBeep();
  }, [setScanStatus, playSuccessBeep]);

  const shouldShowManualInput = scanAttempts >= 4 && scanDuration > 10000;

  return (
    <div className="absolute inset-0 flex flex-col w-full h-full items-center justify-start z-50">
      
      {/* HTML5 QR Code Scanner Container */}
      <div 
        id="reader" 
        className="absolute inset-0 w-full h-full object-cover bg-black" 
      />
      
      {/* Scanner overlay */}
      <ScannerOverlay 
        scanStatus={scanStatus} 
        scanResult={scanResult} 
        scanAttempts={scanAttempts} 
        scanDuration={scanDuration} 
        lightLevel={lightLevel} 
      />
      
      {/* Flashlight button */}
      {showFlash && (
        <FlashlightButton 
          showFlashButton={showFlash} 
          flashEnabled={flashEnabled} 
          videoRef={React.useRef(null)} 
          onFlashToggle={handleFlashToggle} 
        />
      )}
      
      {/* Status display */}
      <ScannerStatusDisplay 
        scanStatus={scanStatus} 
        scanResult={scanResult} 
        isProcessingWithAI={false} 
        onRetry={retryScanning} 
        onUSSDLaunch={handleUSSDLaunch} 
        onShowManualInput={shouldShowManualInput ? () => setShowManualInput(true) : undefined} 
      />
      
      {/* Back button */}
      <ScannerBackButton onBack={onBack} />
      
      {/* Manual QR input fallback */}
      <ManualQRInput 
        isVisible={showManualInput} 
        onQRSubmit={handleManualQRSubmit} 
        onCancel={() => setShowManualInput(false)} 
      />
    </div>
  );
};

export default SmartQRScanner;
