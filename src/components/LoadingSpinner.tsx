
import React from 'react';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

/**
 * LoadingSpinner: Displays loading content with unified liquid glass theme
 */
const LoadingSpinner: React.FC = () => {
  const location = useLocation();

  // Dummy ad data for home page promo banner
  const dummyAd = {
    headline: "🔥 Special Promo: Earn Cashback!",
    description: "Use Mobile Money today & get 10% instant cashback on all payments.",
    ctaLabel: "Learn More",
    ctaLink: "https://promo.example.com",
    imageUrl: "https://images.unsplash.com/photo-1488590528505-98d5aba04b?auto=format&fit=crop&w=180&q=80"
  };

  // Only show promo/ad style banner on the home route
  if (location.pathname === "/") {
    return (
      <div 
        className="p-6 rounded-2xl border-2 border-white/25 shadow-2xl w-full max-w-xl mx-auto"
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
        <div className="flex items-center w-full gap-4">
          {dummyAd.imageUrl && (
            <img
              src={dummyAd.imageUrl}
              alt="Promo"
              className="w-20 h-20 rounded-xl object-cover bg-white/20 shadow-lg flex-shrink-0"
              loading="lazy"
            />
          )}
          <div className="flex-1 min-w-0">
            <div 
              className="text-white font-bold text-lg mb-1"
              style={{
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                animation: 'textPulse 3s ease-in-out infinite'
              }}
            >
              {dummyAd.headline}
            </div>
            <div 
              className="text-white/90 text-sm mb-3"
              style={{
                textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
              }}
            >
              {dummyAd.description}
            </div>
            <a
              href={dummyAd.ctaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 rounded-xl bg-white/90 text-purple-700 font-semibold shadow-lg hover:bg-white transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {dummyAd.ctaLabel}
            </a>
          </div>
        </div>

        <style jsx>{`
          @keyframes glassFloat {
            0%, 100% { 
              transform: translateY(0px) scale(1);
            }
            50% { 
              transform: translateY(-4px) scale(1.01);
            }
          }

          @keyframes textPulse {
            0%, 100% { 
              opacity: 0.9;
              transform: scale(1);
            }
            50% { 
              opacity: 1;
              transform: scale(1.02);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            * {
              animation: none !important;
            }
          }
        `}</style>
      </div>
    );
  }

  // Standard loading spinner with liquid glass theme
  return (
    <div 
      className="flex flex-col items-center justify-center w-full p-8 mx-auto rounded-2xl border-2 border-white/25"
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
      {/* Spinner icon with glow effect */}
      <div className="relative mb-4">
        <Loader2 
          className="w-12 h-12 animate-spin text-white" 
          style={{
            filter: 'drop-shadow(0 4px 8px rgba(255, 255, 255, 0.3))',
            animation: 'spin 1s linear infinite, pulseGlow 2s ease-in-out infinite'
          }}
        />
        
        {/* Glow ring */}
        <div 
          className="absolute inset-0 w-12 h-12 rounded-full border-2 border-white/30"
          style={{
            animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
          }}
        />
      </div>

      <span 
        className="text-white font-semibold text-base"
        style={{
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          animation: 'textPulse 3s ease-in-out infinite'
        }}
      >
        Loading...
      </span>

      <style jsx>{`
        @keyframes glassFloat {
          0%, 100% { 
            transform: translateY(0px) scale(1);
          }
          50% { 
            transform: translateY(-4px) scale(1.01);
          }
        }

        @keyframes pulseGlow {
          0%, 100% { 
            filter: drop-shadow(0 4px 8px rgba(255, 255, 255, 0.3));
          }
          50% { 
            filter: drop-shadow(0 6px 12px rgba(255, 255, 255, 0.6));
          }
        }

        @keyframes textPulse {
          0%, 100% { 
            opacity: 0.9;
          }
          50% { 
            opacity: 1;
          }
        }

        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
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

export default LoadingSpinner;
