
import React from 'react';

interface QualityIndicatorsProps {
  frameQuality: string;
  scanAttempts: number;
  lightLevel?: number | null;
  performanceConfig?: {
    fps: number;
    enableAnimations: boolean;
  };
}

const QualityIndicators: React.FC<QualityIndicatorsProps> = ({
  frameQuality,
  scanAttempts,
  lightLevel,
  performanceConfig
}) => {
  return (
    <>
      {/* Real-time quality indicator */}
      {(frameQuality !== "good" || scanAttempts > 1) && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white flex items-center space-x-1 backdrop-blur-sm">
          <div className={`w-2 h-2 rounded-full ${
            frameQuality === "poor" ? 'bg-red-400' :
            frameQuality === "fair" ? 'bg-yellow-400' :
            frameQuality === "challenging" ? 'bg-purple-400' :
            'bg-green-400'
          } ${performanceConfig?.enableAnimations ? 'animate-pulse' : ''}`} />
          <span className="capitalize">{frameQuality}</span>
          {scanAttempts > 1 && <span>• {scanAttempts}</span>}
          {performanceConfig && (
            <span className="text-gray-400">• {performanceConfig.fps}fps</span>
          )}
        </div>
      )}

      {/* Environmental status indicators */}
      {(lightLevel || frameQuality !== "good") && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 rounded text-xs text-white flex items-center space-x-1 backdrop-blur-sm">
          {lightLevel && (
            <span>{lightLevel > 600 ? '☀️' : lightLevel < 50 ? '🌙' : '🌤️'}</span>
          )}
          {frameQuality !== "good" && (
            <span className={
              frameQuality === "poor" ? 'text-red-300' :
              frameQuality === "fair" ? 'text-yellow-300' :
              'text-purple-300'
            }>●</span>
          )}
        </div>
      )}
    </>
  );
};

export default QualityIndicators;
