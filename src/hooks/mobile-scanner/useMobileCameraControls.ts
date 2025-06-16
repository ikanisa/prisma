
import { useCallback } from 'react';
import { qrScannerServiceNew } from '@/services/QRScannerService';
import { MobileQRScannerState } from './types';

export const useMobileCameraControls = (
  state: MobileQRScannerState,
  updateState: (updates: Partial<MobileQRScannerState>) => void,
  trackUserAction: (action: string, data?: Record<string, any>) => void
) => {
  const toggleTorch = useCallback(async () => {
    if (state.hasTorch) {
      const newTorchState = await qrScannerServiceNew.toggleTorch();
      updateState({ isTorchOn: newTorchState });
      trackUserAction('mobile_torch_toggle', { enabled: newTorchState });
    }
  }, [state.hasTorch, updateState, trackUserAction]);

  const optimizeForLowLight = useCallback(async () => {
    if (state.hasTorch && !state.isTorchOn) {
      await toggleTorch();
    }
    trackUserAction('mobile_low_light_optimization');
  }, [state.hasTorch, state.isTorchOn, toggleTorch, trackUserAction]);

  return {
    toggleTorch,
    optimizeForLowLight
  };
};
