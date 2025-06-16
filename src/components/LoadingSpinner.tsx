
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
      <div className="liquid-glass-panel p-6 w-full max-w-xl mx-auto">
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
            <div className="loader-text text-lg mb-1">
              {dummyAd.headline}
            </div>
            <div className="loader-subtitle text-sm mb-3">
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
      </div>
    );
  }

  // Standard loading spinner with liquid glass theme
  return (
    <div className="liquid-glass-panel flex flex-col items-center justify-center w-full p-8 mx-auto">
      {/* Spinner icon with glow effect */}
      <div className="relative mb-4">
        <Loader2 
          className="w-12 h-12 animate-spin text-white" 
          style={{
            filter: 'drop-shadow(0 4px 8px rgba(255, 255, 255, 0.3))',
          }}
        />
        
        {/* Glow ring */}
        <div 
          className="absolute inset-0 w-12 h-12 rounded-full border-2 border-white/30 animate-ping"
        />
      </div>

      <span className="loader-text text-base">
        Loading...
      </span>
    </div>
  );
};

export default LoadingSpinner;
