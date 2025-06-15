
import React from 'react';

/**
 * LoadingSpinner: Displays a visible ad banner placeholder with dummy ad content (instead of spinner).
 * This fully hides the loading spinner UI per user request.
 */
const LoadingSpinner: React.FC = () => {
  // Dummy ad data for placeholder banner
  const dummyAd = {
    headline: "🔥 Special Promo: Earn Cashback!",
    description: "Use Mobile Money today & get 10% instant cashback on all payments.",
    ctaLabel: "Learn More",
    ctaLink: "https://promo.example.com",
    gradient: ["#FF512F", "#DD2476"],
    imageUrl: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=180&q=80"
  };

  return (
    <div
      className="flex flex-col items-center justify-center w-full p-4 rounded-xl shadow-lg max-w-xl mx-auto"
      style={{ background: `linear-gradient(90deg, ${dummyAd.gradient.join(',')})` }}
    >
      <div className="flex items-center w-full gap-4">
        {dummyAd.imageUrl && (
          <img
            src={dummyAd.imageUrl}
            alt="Promo"
            className="w-20 h-20 rounded-lg object-cover bg-white/20 shadow-lg"
            style={{ flexShrink: 0 }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-lg">{dummyAd.headline}</div>
          <div className="text-white/90 text-sm mt-1">{dummyAd.description}</div>
          <a
            href={dummyAd.ctaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 px-4 py-1 rounded-full bg-white/90 text-pink-700 font-semibold shadow hover:bg-white transition-all"
          >
            {dummyAd.ctaLabel}
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
