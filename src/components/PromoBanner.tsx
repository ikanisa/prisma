
import React, { useState, useEffect } from 'react';
import { Gift, ArrowRight, X } from 'lucide-react';

const PromoBanner = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Auto-hide after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  // Handle swipe to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe || isRightSwipe) {
      setIsVisible(false);
    }
  };

  const handleLearnMore = () => {
    window.open('https://your-app-link.com/promo', '_blank');
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`
        fixed top-4 left-4 right-4 z-50 
        bg-royal-pulse text-white p-6 rounded-2xl 
        shadow-lg backdrop-blur-xl 
        animate-fade-slide 
        min-h-[120px] 
        flex items-center justify-between
        glass-panel
        ${isVisible ? 'animate-glow-pulse' : ''}
      `}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Left Icon */}
      <div className="flex-shrink-0 mr-4">
        <Gift className="w-10 h-10 text-white animate-pulse" />
      </div>

      {/* Content */}
      <div className="flex-1 text-center">
        <div className="text-xl font-bold mb-2 animate-pulse">
          🔥 Limited Time Offer: Get 10% Cashback on First Payment!
        </div>
        <div className="text-md opacity-90">
          Only this week. Use code <span className="font-bold">*MOMO10*</span> at checkout.
        </div>
        
        {/* Learn More Button */}
        <button
          onClick={handleLearnMore}
          className="
            mt-3 px-6 py-2 
            bg-sunset-dream 
            rounded-full 
            font-semibold 
            text-white 
            shadow-lg 
            hover:scale-105 
            transform 
            transition-all 
            duration-200
            flex items-center 
            space-x-2 
            mx-auto
          "
        >
          <span>Learn More</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Close Button */}
      <button
        onClick={handleDismiss}
        className="
          flex-shrink-0 ml-4 
          w-8 h-8 
          rounded-full 
          bg-white/20 
          hover:bg-white/30 
          flex items-center 
          justify-center 
          transition-colors
        "
      >
        <X className="w-4 h-4 text-white" />
      </button>
    </div>
  );
};

export default PromoBanner;
