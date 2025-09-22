import { useState, useRef } from 'react';
import { ScanTransaction } from '@/services/QRScannerService';
import { ScanResult } from '@/services/scanningManager';

export const useQRScannerState = () => {
  const [isScanning, setIsScanning] = useState(true);
  const [scannedCodes, setScannedCodes] = useState<Array<{
    code: string;
    result: ScanResult;
    timestamp: number;
    transaction?: ScanTransaction;
  }>>([]);
  const [currentTransaction, setCurrentTransaction] = useState<ScanTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lightingCondition, setLightingCondition] = useState<string>('normal');
  const [torchUsed, setTorchUsed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showManualInput, setShowManualInput] = useState(false);
  const [isEnhancedMode, setIsEnhancedMode] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [currentError, setCurrentError] = useState<Error | null>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const [initializationInProgress, setInitializationInProgress] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  
  const scannerElementRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const addScannedCode = (code: string, result: ScanResult, transaction?: ScanTransaction) => {
    const newScan = {
      code,
      result,
      timestamp: Date.now(),
      transaction
    };
    
    setScannedCodes(prev => [newScan, ...prev.slice(0, 9)]); // Keep last 10 scans
    
    // Store in localStorage for persistence across sessions
    try {
      const stored = localStorage.getItem('qr_scan_history') || '[]';
      const history = JSON.parse(stored);
      const updatedHistory = [newScan, ...history.slice(0, 19)]; // Keep last 20 in storage
      localStorage.setItem('qr_scan_history', JSON.stringify(updatedHistory));
    } catch (error) {
      console.warn('Failed to store scan history:', error);
    }
  };

  const loadScanHistory = () => {
    try {
      const stored = localStorage.getItem('qr_scan_history');
      if (stored) {
        const history = JSON.parse(stored);
        const recentHistory = history.filter((scan: any) => 
          Date.now() - scan.timestamp < 2 * 60 * 1000 // 2 minutes
        );
        setScannedCodes(recentHistory);
      }
    } catch (error) {
      console.warn('Failed to load scan history:', error);
    }
  };

  const clearScanHistory = () => {
    setScannedCodes([]);
    localStorage.removeItem('qr_scan_history');
  };

  const resetState = () => {
    setCurrentTransaction(null);
    setError(null);
    setTorchUsed(false);
    setRetryCount(0);
    setIsEnhancedMode(false);
    setScannerReady(false);
    setInitializationInProgress(false);
    // Keep scannedCodes and isScanning for continuous operation
  };

  const getLatestScan = () => {
    return scannedCodes.length > 0 ? scannedCodes[0] : null;
  };

  return {
    // State
    isScanning, setIsScanning,
    scannedCodes, setScannedCodes,
    currentTransaction, setCurrentTransaction,
    error, setError,
    isLoading, setIsLoading,
    lightingCondition, setLightingCondition,
    torchUsed, setTorchUsed,
    retryCount, setRetryCount,
    showManualInput, setShowManualInput,
    isEnhancedMode, setIsEnhancedMode,
    showErrorModal, setShowErrorModal,
    currentError, setCurrentError,
    scannerReady, setScannerReady,
    initializationInProgress, setInitializationInProgress,
    continuousMode, setContinuousMode,
    
    // Refs
    scannerElementRef,
    videoRef,
    
    // Actions
    addScannedCode,
    loadScanHistory,
    clearScanHistory,
    resetState,
    getLatestScan
  };
};
