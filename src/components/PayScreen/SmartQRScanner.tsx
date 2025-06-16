
import React, { useState, useCallback } from "react";
import { useSmartQRScanner } from "@/hooks/useSmartQRScanner";
import { useAudioFeedback } from "@/hooks/useAudioFeedback";
import ScannerOverlay from "./ScannerOverlay";
import ScannerCamera from "./ScannerCamera";
import ScannerControls from "./ScannerControls";
import ScannerStatusManager from "./ScannerStatusManager";

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

  return (
    <div className="absolute inset-0 flex flex-col w-full h-full items-center justify-start z-50">
      
      {/* Camera container */}
      <ScannerCamera isActive={scanStatus === 'scanning'} />
      
      {/* Scanner overlay */}
      <ScannerOverlay 
        scanStatus={scanStatus} 
        scanResult={scanResult} 
        scanAttempts={scanAttempts} 
        scanDuration={scanDuration} 
        lightLevel={lightLevel} 
      />
      
      {/* Controls */}
      <ScannerControls
        showFlash={showFlash}
        flashEnabled={flashEnabled}
        onFlashToggle={handleFlashToggle}
        onBack={onBack}
      />
      
      {/* Status management */}
      <ScannerStatusManager
        scanStatus={scanStatus}
        scanResult={scanResult}
        scanAttempts={scanAttempts}
        scanDuration={scanDuration}
        showManualInput={showManualInput}
        onRetry={retryScanning}
        onUSSDLaunch={handleUSSDLaunch}
        onShowManualInput={() => setShowManualInput(true)}
        onManualQRSubmit={handleManualQRSubmit}
        onCancelManualInput={() => setShowManualInput(false)}
      />
    </div>
  );
};

export default SmartQRScanner;
