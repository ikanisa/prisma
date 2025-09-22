
import { useEffect } from 'react';

export const useMobileOrientationHandler = (
  isScanning: boolean,
  rescan: () => void,
  trackUserAction: (action: string, data?: Record<string, any>) => void
) => {
  useEffect(() => {
    const handleOrientationChange = () => {
      // Handle device orientation changes
      setTimeout(() => {
        if (isScanning) {
          rescan();
        }
      }, 500);
      trackUserAction('mobile_orientation_change');
    };

    // Listen for orientation changes on mobile
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [isScanning, rescan, trackUserAction]);
};
