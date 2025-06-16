
import { useEffect } from 'react';
import { useUniversalQRScannerState } from './useUniversalQRScannerState';
import { useUniversalQRScannerCamera } from './useUniversalQRScannerCamera';
import { useUniversalQRScannerActions } from './useUniversalQRScannerActions';

export const useUniversalQRScanner = () => {
  const { state, updateState, resetScanState } = useUniversalQRScannerState();
  const { videoRef, initialize: initializeCamera, startScanning: startCameraScanning, toggleTorch: toggleCameraTorch, cleanup: cleanupCamera } = useUniversalQRScannerCamera();
  const { processScanResult, processManualInput, launchUssd } = useUniversalQRScannerActions();

  const initialize = async () => {
    updateState({ isLoading: true, hasError: false });

    const result = await initializeCamera(
      async () => {
        await startScanning();
      },
      (errorMessage) => {
        updateState({ 
          hasError: true, 
          errorMessage,
          isLoading: false 
        });
      }
    );

    if (result) {
      updateState({ hasTorch: result.hasTorch, isLoading: false });
    }
  };

  const startScanning = async () => {
    const success = await startCameraScanning(
      async (result) => {
        await processScanResult(result, (enhancedResult, validation, transaction) => {
          updateState({ 
            scannedResult: enhancedResult,
            ussdValidation: validation,
            isScanning: false,
            currentTransaction: transaction || null
          });
        });
      },
      (errorMessage) => {
        updateState({ 
          hasError: true, 
          errorMessage,
          showManualInput: true 
        });
      }
    );

    if (success) {
      updateState({ isScanning: true, hasError: false });
    }
  };

  const handleManualInput = async (code: string) => {
    await processManualInput(code, (result, validation, transaction) => {
      updateState({ 
        scannedResult: result,
        ussdValidation: validation,
        isScanning: false,
        showManualInput: false,
        currentTransaction: transaction || null
      });
    });
  };

  const toggleTorch = async () => {
    if (state.hasTorch) {
      const newTorchState = await toggleCameraTorch(state.hasTorch);
      updateState({ isTorchOn: newTorchState });
    }
  };

  const rescan = () => {
    resetScanState();
    startScanning();
  };

  const cleanup = () => {
    console.log('useUniversalQRScanner: Cleaning up...');
    cleanupCamera();
  };

  const handleLaunchUssd = async (ussdCode: string) => {
    try {
      await launchUssd(ussdCode, state.currentTransaction?.id);
    } catch (error) {
      updateState({ 
        hasError: true, 
        errorMessage: 'Failed to launch dialer' 
      });
    }
  };

  return {
    // State
    ...state,
    videoRef,
    
    // Actions
    initialize,
    startScanning,
    handleManualInput,
    toggleTorch,
    rescan,
    cleanup,
    launchUssd: handleLaunchUssd,
    setShowManualInput: (show: boolean) => updateState({ showManualInput: show })
  };
};
