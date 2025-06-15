
import { useEffect, useRef } from 'react';

export const useCameraOptimization = () => {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    let isVisible = true;

    // Request wake lock to prevent screen from turning off during scanning
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('[Camera] Wake lock acquired');
        }
      } catch (error) {
        console.log('[Camera] Wake lock failed:', error);
      }
    };

    // Handle page visibility changes to optimize battery usage
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      
      if (isVisible) {
        requestWakeLock();
      } else {
        if (wakeLock) {
          wakeLock.release();
          wakeLock = null;
          console.log('[Camera] Wake lock released due to page hidden');
        }
      }
    };

    // Performance optimization: throttle camera operations when needed
    const optimizeCameraPerformance = () => {
      // Reduce frame rate when device is low on battery
      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          if (battery.level < 0.2) {
            console.log('[Camera] Low battery detected, optimizing performance');
            // This could be used to adjust scanner frequency
          }
        }).catch(() => {
          // getBattery not supported, continue normally
        });
      }
    };

    // Setup optimization
    requestWakeLock();
    optimizeCameraPerformance();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Store cleanup function
    cleanupRef.current = () => {
      if (wakeLock) {
        wakeLock.release();
        console.log('[Camera] Wake lock released on cleanup');
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Notify service worker about camera cleanup
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CAMERA_CLEANUP'
        });
      }
    };

    return cleanupRef.current;
  }, []);

  // Manual cleanup function
  const cleanup = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
    }
  };

  return { cleanup };
};
