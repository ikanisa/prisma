
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden">
      {/* Liquid glass background matching main splash */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          background: 'linear-gradient(135deg, #00C9A7 0%, #6A00F4 50%, #FF6F91 100%)',
          backgroundSize: '300% 300%',
          animation: 'gradientShift 8s ease-in-out infinite'
        }}
      />
      
      {/* Animated liquid blobs */}
      <div 
        className="absolute w-full h-full opacity-70"
        style={{
          background: `
            radial-gradient(circle at 30% 40%, rgba(255,255,255,0.15), transparent 60%),
            radial-gradient(circle at 70% 60%, rgba(255,255,255,0.1), transparent 50%),
            radial-gradient(circle at 50% 80%, rgba(255,255,255,0.12), transparent 70%)
          `,
          filter: 'blur(60px)',
          animation: 'liquidFloat 15s ease-in-out infinite'
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 text-center px-6 max-w-sm mx-auto">
        {/* Glass panel with logo */}
        <div 
          className="mb-8 p-8 rounded-2xl border-2 border-white/25 shadow-2xl"
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: `
              0 8px 40px rgba(0, 0, 0, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.4)
            `,
            animation: 'glassFloat 6s ease-in-out infinite'
          }}
        >
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
          <h1 
            className="text-2xl font-bold mb-2 text-white"
            style={{
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              animation: 'textPulse 3s ease-in-out infinite'
            }}
          >
            MoMo Pay
          </h1>
          
          {/* Tagline */}
          <p 
            className="text-sm text-white/90 mb-6 font-medium"
            style={{
              textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
              animation: 'subtitleFade 2s ease-in-out infinite alternate'
            }}
          >
            Mobile Money Scanner
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

      <style jsx>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes liquidFloat {
          0%, 100% { 
            transform: scale(1) translate(0, 0) rotate(0deg);
            opacity: 0.7;
          }
          33% { 
            transform: scale(1.1) translate(-10px, -15px) rotate(120deg);
            opacity: 0.9;
          }
          66% { 
            transform: scale(0.9) translate(15px, 10px) rotate(240deg);
            opacity: 0.8;
          }
        }

        @keyframes glassFloat {
          0%, 100% { 
            transform: translateY(0px) scale(1);
          }
          50% { 
            transform: translateY(-8px) scale(1.02);
          }
        }

        @keyframes textPulse {
          0%, 100% { 
            opacity: 0.9;
            transform: scale(1);
          }
          50% { 
            opacity: 1;
            transform: scale(1.05);
          }
        }

        @keyframes subtitleFade {
          0% { opacity: 0.7; }
          100% { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
