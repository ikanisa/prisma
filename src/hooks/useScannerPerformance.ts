
import { useState, useRef } from "react";

export const useScannerPerformance = () => {
  const [scanDuration, setScanDuration] = useState(0);
  const [scanStartTime, setScanStartTime] = useState<number | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Performance-optimized duration tracking
  const startDurationTracking = () => {
    const startTime = Date.now();
    setScanStartTime(startTime);
    setScanDuration(0);
    
    // Use lower frequency timer for better performance
    durationTimerRef.current = setInterval(() => {
      setScanDuration(Date.now() - startTime);
    }, 1000); // Update every second instead of more frequently
  };

  const stopDurationTracking = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  };

  const resetDuration = () => {
    setScanDuration(0);
    setScanStartTime(null);
    stopDurationTracking();
  };

  return {
    scanDuration,
    scanStartTime,
    startDurationTracking,
    stopDurationTracking,
    resetDuration
  };
};
