
import { useState, useRef } from 'react';
import { ScanTransaction } from '@/services/qrScannerService';
import { ScanResult } from '@/services/scanningManager';

export const useQRScannerState = () => {
  const [isScanning, setIsScanning] = useState(true);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [currentTransaction, setCurrentTransaction] = useState<ScanTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lightingCondition, setLightingCondition] = useState<string>('normal');
  const [torchUsed, setTorchUsed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [isEnhancedMode, setIsEnhancedMode] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [currentError, setCurrentError] = useState<Error | null>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const [initializationInProgress, setInitializationInProgress] = useState(false);
  
  const scannerElementRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const resetState = () => {
    setScannedCode(null);
    setCurrentTransaction(null);
    setScanResult(null);
    setError(null);
    setIsScanning(true);
    setTorchUsed(false);
    setRetryCount(0);
    setIsEnhancedMode(false);
    setScannerReady(false);
    setInitializationInProgress(false);
  };

  return {
    // State
    isScanning, setIsScanning,
    scannedCode, setScannedCode,
    currentTransaction, setCurrentTransaction,
    error, setError,
    isLoading, setIsLoading,
    lightingCondition, setLightingCondition,
    torchUsed, setTorchUsed,
    retryCount, setRetryCount,
    scanResult, setScanResult,
    showManualInput, setShowManualInput,
    isEnhancedMode, setIsEnhancedMode,
    showErrorModal, setShowErrorModal,
    currentError, setCurrentError,
    scannerReady, setScannerReady,
    initializationInProgress, setInitializationInProgress,
    
    // Refs
    scannerElementRef,
    videoRef,
    
    // Actions
    resetState
  };
};
