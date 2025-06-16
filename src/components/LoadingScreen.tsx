
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
      }, 500);
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) {
    return (
      <div className="fixed inset-0 z-50 bg-black opacity-0 transition-opacity duration-500 pointer-events-none" />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-white">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-40 left-1/2 transform -translate-x-1/2 w-80 h-80 bg-teal-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center px-8">
        {/* Logo/Icon */}
        <div className="mb-8 relative">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-400 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
            <svg 
              className="w-12 h-12 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" 
              />
            </svg>
          </div>
          
          {/* Pulse rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 border-2 border-blue-400 rounded-3xl animate-ping opacity-20"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 border-2 border-purple-400 rounded-3xl animate-ping opacity-10 animation-delay-1000"></div>
          </div>
        </div>

        {/* App Name */}
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          MoMo Pay
        </h1>
        
        {/* Tagline */}
        <p className="text-xl text-gray-300 mb-8 font-light">
          Universal Mobile Money Scanner
        </p>

        {/* Progress Bar */}
        <div className="w-64 mx-auto mb-6">
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Loading Text */}
        <p className="text-sm text-gray-400 animate-pulse">
          {progress < 30 ? 'Initializing...' :
           progress < 60 ? 'Loading components...' :
           progress < 90 ? 'Setting up scanner...' :
           'Ready!'}
        </p>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-10 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default LoadingScreen;
