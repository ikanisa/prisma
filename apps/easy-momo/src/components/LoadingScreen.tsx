
import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onComplete?: () => void;
  duration?: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  onComplete, 
  duration = 2000 
}) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, duration / 50);

    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete?.();
      }, 600);
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) {
    return (
      <div className="fixed inset-0 z-50 bg-black opacity-0 transition-opacity duration-600 pointer-events-none" />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden liquid-theme">
      {/* Animated liquid blobs */}
      <div className="liquid-bg" />

      {/* Main Content */}
      <div className="relative z-10 text-center px-6 max-w-sm mx-auto">
        {/* Glass panel with logo */}
        <div className="logo-glass mb-8 p-8">
          {/* App icon */}
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-white/20 to-white/10 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-sm">
            <svg 
              className="w-8 h-8 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 9h6v6H9z" 
              />
            </svg>
          </div>

          {/* App Name */}
          <h1 className="loader-text text-2xl mb-2">
            EasyMOMO
          </h1>
          
          {/* Tagline */}
          <p className="loader-subtitle text-sm mb-6 font-medium">
            Pay . Get Paid . Instant . Secure
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden mb-3 backdrop-blur-sm">
            <div 
              className="h-full bg-gradient-to-r from-white/80 to-white/60 rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Loading Text */}
          <p className="text-xs text-white/80 font-medium">
            {progress < 30 ? 'Initializing...' :
             progress < 60 ? 'Loading scanner...' :
             progress < 90 ? 'Setting up camera...' :
             'Ready!'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
