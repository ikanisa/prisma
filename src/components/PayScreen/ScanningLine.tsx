
import React from 'react';

interface ScanningLineProps {
  frameQuality: string;
  performanceConfig?: {
    enableAnimations: boolean;
    fps: number;
  };
}

const ScanningLine: React.FC<ScanningLineProps> = ({
  frameQuality,
  performanceConfig
}) => {
  if (!performanceConfig?.enableAnimations) {
    return null;
  }

  const animationDuration = performanceConfig.fps < 8 ? '2.5s' : performanceConfig.fps < 12 ? '2s' : '1.5s';
  
  const gradientClass = frameQuality === "poor" 
    ? 'bg-gradient-to-r from-transparent via-red-400 to-transparent'
    : frameQuality === "fair"
      ? 'bg-gradient-to-r from-transparent via-yellow-400 to-transparent'
      : 'bg-gradient-to-r from-transparent via-blue-400 to-transparent';

  const borderClass = frameQuality === "poor" 
    ? 'border-red-300/60 animate-pulse'
    : frameQuality === "fair"
      ? 'border-yellow-300/60 animate-pulse'
      : 'border-blue-300/50 animate-pulse';

  return (
    <>
      <div 
        className={`absolute left-0 right-0 h-1.5 rounded shadow-lg transition-all duration-300 ${gradientClass}`}
        style={{ 
          top: 0, 
          animationName: 'scanline',
          animationDuration,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out'
        }} 
      />
      
      <div className={`absolute inset-0 border-2 rounded-2xl transition-all duration-300 ${borderClass}`} />
    </>
  );
};

export default ScanningLine;
