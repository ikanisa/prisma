
import React, { useMemo, useCallback, memo } from 'react';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';

interface OptimizedScannerRendererProps {
  scanStatus: 'idle' | 'scanning' | 'success' | 'fail' | 'processing';
  frameQuality: 'poor' | 'fair' | 'challenging' | 'good';
  lightLevel?: number | null;
  scanDuration: number;
  children: React.ReactNode;
}

const OptimizedScannerRenderer: React.FC<OptimizedScannerRendererProps> = memo(({
  scanStatus,
  frameQuality,
  lightLevel,
  scanDuration,
  children
}) => {
  const {
    metrics,
    optimalConfig,
    shouldReduceAnimations
  } = usePerformanceOptimization();

  // Memoized style calculations to prevent re-renders
  const overlayStyles = useMemo(() => {
    const baseOpacity = lightLevel && lightLevel > 600 ? 0.85 : 0.75;
    let adjustedOpacity = baseOpacity;
    if (scanDuration > 5000) adjustedOpacity += 0.1;
    if (lightLevel && lightLevel > 800) adjustedOpacity += 0.1;
    else if (lightLevel && lightLevel < 20) adjustedOpacity -= 0.1;
    return {
      opacity: Math.min(Math.max(adjustedOpacity, 0.6), 0.95),
      transition: shouldReduceAnimations ? 'none' : 'opacity 0.5s ease-out'
    };
  }, [lightLevel, scanDuration, shouldReduceAnimations]);

  // Optimized background gradient calculation
  const backgroundGradient = useMemo(() => {
    if (!optimalConfig.enableAnimations) {
      return 'bg-black/80';
    }
    if (scanDuration > 7000) {
      return 'bg-gradient-to-br from-red-500/25 via-orange-500/20 to-yellow-500/20';
    }
    if (scanDuration > 4000) {
      return 'bg-gradient-to-br from-yellow-500/20 via-orange-500/15 to-red-500/15';
    }
    return 'bg-gradient-to-br from-blue-500/10 via-blue-700/10 to-indigo-500/10';
  }, [scanDuration, optimalConfig.enableAnimations]);

  // Optimized animation classes
  const animationClasses = useMemo(() => {
    if (shouldReduceAnimations) {
      return '';
    }
    const baseClass = 'transition-all duration-500';
    if (scanStatus === 'scanning' || scanStatus === 'processing') {
      return `${baseClass} animate-pulse`;
    }
    return baseClass;
  }, [shouldReduceAnimations, scanStatus]);

  // Performance-aware blur effects
  const blurEffects = useMemo(() => {
    if (!optimalConfig.enableBlur) {
      return 'backdrop-blur-none';
    }
    return frameQuality === 'poor' ? 'backdrop-blur-sm' : 'backdrop-blur-md';
  }, [optimalConfig.enableBlur, frameQuality]);

  return (
    <div 
      className={`absolute inset-0 ${backgroundGradient} ${blurEffects} ${animationClasses}`}
      style={overlayStyles}
    >
      {children}
    </div>
  );
});

OptimizedScannerRenderer.displayName = 'OptimizedScannerRenderer';
export default OptimizedScannerRenderer;
