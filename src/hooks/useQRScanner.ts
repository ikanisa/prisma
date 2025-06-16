
import { useEffect } from 'react';
import { useQRScannerState } from './useQRScannerState';
import { useQRScannerActions } from './useQRScannerActions';
import { useQRScannerEnhanced } from './useQRScannerEnhanced';
import { useQRScannerInit } from './useQRScannerInit';

export const useQRScanner = () => {
  const state = useQRScannerState();
  
  const actions = useQRScannerActions({
    state,
    lightingCondition: state.lightingCondition,
    torchUsed: state.torchUsed,
    retryCount: state.retryCount
  });

  const enhanced = useQRScannerEnhanced({
    videoRef: state.videoRef,
    onScanSuccess: actions.handleScanSuccess,
    setState: state
  });

  const init = useQRScannerInit({
    state,
    videoRef: state.videoRef,
    onScanSuccess: actions.handleScanSuccess,
    retryCount: state.retryCount
  });

  // Initialize when component mounts and scanner element is ready
  useEffect(() => {
    if (state.scannerElementRef.current && !state.scannerReady && !state.initializationInProgress) {
      init.handleScannerReady();
    }
  }, [state.scannerReady, state.initializationInProgress]);

  return {
    // State
    isScanning: state.isScanning,
    scannedCodes: state.scannedCodes,
    currentTransaction: state.currentTransaction,
    error: state.error,
    isLoading: state.isLoading,
    lightingCondition: state.lightingCondition,
    torchUsed: state.torchUsed,
    retryCount: state.retryCount,
    showManualInput: state.showManualInput,
    isEnhancedMode: state.isEnhancedMode,
    showErrorModal: state.showErrorModal,
    currentError: state.currentError,
    scannerElementRef: state.scannerElementRef,
    videoRef: state.videoRef,
    isOnline: actions.isOnline,
    scannerReady: state.scannerReady,
    continuousMode: state.continuousMode,
    
    // Actions
    initializeScanner: init.initializeScanner,
    handleScanSuccess: actions.handleScanSuccess,
    handleEnhancedScan: enhanced.handleEnhancedScan,
    handleManualInput: actions.handleManualInput,
    handleLaunchMoMo: actions.handleLaunchMoMo,
    handleRescan: actions.handleRescan,
    stopScanning: actions.stopScanning,
    toggleContinuousMode: actions.toggleContinuousMode,
    handleTorchToggle: enhanced.handleTorchToggle,
    handleLightingChange: enhanced.handleLightingChange,
    handleScannerReady: init.handleScannerReady,
    cleanup: init.cleanup,
    setShowManualInput: state.setShowManualInput,
    setShowErrorModal: state.setShowErrorModal,
    setCurrentError: state.setCurrentError,
    setRetryCount: state.setRetryCount,
    loadScanHistory: state.loadScanHistory,
    clearScanHistory: state.clearScanHistory,
    getLatestScan: state.getLatestScan
  };
};
