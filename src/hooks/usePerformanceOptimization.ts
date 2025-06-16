
import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  frameRate: number;
  memoryUsage: number;
  batteryLevel: number | null;
  deviceType: 'high' | 'medium' | 'low';
}

export const usePerformanceOptimization = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    frameRate: 10,
    memoryUsage: 0,
    batteryLevel: null,
    deviceType: 'medium'
  });
  
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());
  const performanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect device performance tier
  const detectDevicePerformance = useCallback(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    let deviceType: 'high' | 'medium' | 'low' = 'medium';
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        // Basic GPU performance detection
        if (renderer.includes('Mali') || renderer.includes('Adreno 3')) {
          deviceType = 'low';
        } else if (renderer.includes('Apple') || renderer.includes('NVIDIA')) {
          deviceType = 'high';
        }
      }
    }
    
    // Check memory and cores
    const memory = (navigator as any).deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    
    if (memory < 3 || cores < 4) {
      deviceType = 'low';
    } else if (memory >= 8 && cores >= 8) {
      deviceType = 'high';
    }
    
    return deviceType;
  }, []);

  // Get optimal frame rate based on device performance
  const getOptimalFrameRate = useCallback((deviceType: 'high' | 'medium' | 'low', batteryLevel: number | null) => {
    let baseRate = deviceType === 'high' ? 15 : deviceType === 'medium' ? 10 : 6;
    
    // Reduce frame rate on low battery
    if (batteryLevel && batteryLevel < 0.2) {
      baseRate = Math.max(baseRate - 4, 3);
    } else if (batteryLevel && batteryLevel < 0.5) {
      baseRate = Math.max(baseRate - 2, 4);
    }
    
    return baseRate;
  }, []);

  // Monitor battery level
  const monitorBattery = useCallback(async () => {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        setMetrics(prev => ({ 
          ...prev, 
          batteryLevel: battery.level,
          frameRate: getOptimalFrameRate(prev.deviceType, battery.level)
        }));
        
        // Listen for battery changes
        battery.addEventListener('levelchange', () => {
          setMetrics(prev => ({ 
            ...prev, 
            batteryLevel: battery.level,
            frameRate: getOptimalFrameRate(prev.deviceType, battery.level)
          }));
        });
      }
    } catch (error) {
      console.log('[Performance] Battery API not available:', error);
    }
  }, [getOptimalFrameRate]);

  // Monitor memory usage
  const monitorMemory = useCallback(() => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const usagePercent = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
      
      setMetrics(prev => ({
        ...prev,
        memoryUsage: usagePercent
      }));
      
      // Adjust frame rate based on memory pressure
      if (usagePercent > 80) {
        setMetrics(prev => ({
          ...prev,
          frameRate: Math.max(prev.frameRate - 3, 2)
        }));
      }
    }
  }, []);

  // Performance monitoring loop
  useEffect(() => {
    const deviceType = detectDevicePerformance();
    setMetrics(prev => ({ 
      ...prev, 
      deviceType,
      frameRate: getOptimalFrameRate(deviceType, prev.batteryLevel)
    }));
    
    monitorBattery();
    
    performanceTimerRef.current = setInterval(() => {
      monitorMemory();
    }, 5000);
    
    return () => {
      if (performanceTimerRef.current) {
        clearInterval(performanceTimerRef.current);
      }
    };
  }, [detectDevicePerformance, getOptimalFrameRate, monitorBattery, monitorMemory]);

  // Memory cleanup function
  const performMemoryCleanup = useCallback(() => {
    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc();
      } catch (error) {
        console.log('[Performance] Manual GC not available');
      }
    }
    
    // Clear any cached image data
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
  }, []);

  return {
    metrics,
    performMemoryCleanup,
    isLowPerformanceDevice: metrics.deviceType === 'low',
    shouldReduceAnimations: metrics.deviceType === 'low' || (metrics.batteryLevel !== null && metrics.batteryLevel < 0.3),
    optimalConfig: {
      fps: metrics.frameRate,
      enableAnimations: metrics.deviceType !== 'low' && (metrics.batteryLevel === null || metrics.batteryLevel > 0.2),
      enableBlur: metrics.deviceType === 'high',
      enableShadows: metrics.deviceType !== 'low'
    }
  };
};
