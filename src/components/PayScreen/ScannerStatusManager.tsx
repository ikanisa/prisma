
import React from 'react';
import ScannerStatusDisplay from './ScannerStatusDisplay';
import ManualQRInput from './ManualQRInput';

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

interface ScannerStatusManagerProps {
  scanStatus: ScanStatus;
  scanResult: string | null;
  scanAttempts: number;
  scanDuration: number;
  showManualInput: boolean;
  onRetry: () => void;
  onUSSDLaunch: () => void;
  onShowManualInput: () => void;
  onManualQRSubmit: (qrData: string) => void;
  onCancelManualInput: () => void;
}

const ScannerStatusManager: React.FC<ScannerStatusManagerProps> = ({
  scanStatus,
  scanResult,
  scanAttempts,
  scanDuration,
  showManualInput,
  onRetry,
  onUSSDLaunch,
  onShowManualInput,
  onManualQRSubmit,
  onCancelManualInput
}) => {
  const shouldShowManualInput = scanAttempts >= 4 && scanDuration > 10000;

  return (
    <>
      <ScannerStatusDisplay 
        scanStatus={scanStatus} 
        scanResult={scanResult} 
        isProcessingWithAI={false} 
        onRetry={onRetry} 
        onUSSDLaunch={onUSSDLaunch} 
        onShowManualInput={shouldShowManualInput ? onShowManualInput : undefined} 
      />
      
      <ManualQRInput 
        isVisible={showManualInput} 
        onQRSubmit={onManualQRSubmit} 
        onCancel={onCancelManualInput} 
      />
    </>
  );
};

export default ScannerStatusManager;
