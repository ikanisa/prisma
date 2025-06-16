
import React, { useEffect, useState, useRef } from "react";
import { fetchAds } from "@/services/firestore";
import { ArrowLeft, ArrowRight, Minus } from "lucide-react";
import PromoBannerMinimized from "./PromoBannerMinimized";
import PromoBannerLoading from "./PromoBannerLoading";

// Types
type Ad = {
  id: string;
  headline: string;
  description: string;
  ctaLabel: string;
  ctaLink: string;
  gradient: string[];
  imageUrl?: string;
};
const ROTATE_INTERVAL = 5000;
const BANNER_LOCAL_KEY = "promo_banner_minimized";

// FOUR NEW BANNERS WITH UPDATED CONTENT
const DUMMY_ADS: Ad[] = [{
  id: "dummy1",
  headline: "🚀 Start Scanning. No Login Needed",
  description: "Just open the app and scan. No signup, no friction.",
  ctaLabel: "Start Scanning",
  ctaLink: "/pay",
  gradient: ["#396afc", "#2948ff", "#AD00FF"],
  imageUrl: ""
}, {
  id: "dummy2",
  headline: "📶 Works Even Without Internet",
  description: "You can scan QR codes and launch MoMo payments even if you're offline.",
  ctaLabel: "Try Offline Mode",
  ctaLink: "/pay",
  gradient: ["#0ba360", "#3cba92", "#30dd8a"],
  imageUrl: ""
}, {
  id: "dummy3",
  headline: "💰 No Extra Charges — Ever",
  description: "We don't charge any fees. You only pay what MTN or your provider normally charges.",
  ctaLabel: "Learn More",
  ctaLink: "#",
  gradient: ["#FF512F", "#DD2476", "#FFB347"],
  imageUrl: ""
}, {
  id: "dummy4",
  headline: "📲 Love it? Share it!",
  description: "Tell your friends — easyMOMO is smart, fast, and secure. Help more people skip the queue.",
  ctaLabel: "Share App",
  ctaLink: "#share",
  gradient: ["#667eea", "#764ba2", "#f093fb"],
  imageUrl: ""
}];

const PromoBanner: React.FC = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [minimized, setMinimized] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(BANNER_LOCAL_KEY);
      return stored === "true";
    }
    return false;
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let running = true;
    fetchAds().then(fetchedAds => {
      if (!running) return;
      // Use four new banners if Firestore returns 0 ads
      if (fetchedAds && fetchedAds.length) {
        setAds(fetchedAds as Ad[]);
      } else {
        setAds(DUMMY_ADS);
      }
      setLoading(false);
    }).catch(() => {
      if (running) {
        setAds(DUMMY_ADS);
        setLoading(false);
      }
    });
    return () => {
      running = false;
    };
  }, []);

  useEffect(() => {
    if (ads.length === 0 || minimized) return;
    timerRef.current = setInterval(() => {
      setActiveIdx(idx => (idx + 1) % ads.length);
    }, ROTATE_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ads, minimized]);

  // Persist minimized state
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(BANNER_LOCAL_KEY, minimized ? "true" : "false");
  }, [minimized]);

  const handlePrev = () => {
    setActiveIdx(idx => (idx - 1 + ads.length) % ads.length);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleNext = () => {
    setActiveIdx(idx => (idx + 1) % ads.length);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleMinimize = () => setMinimized(true);
  const handleRestore = () => setMinimized(false);

  // -------------------- Minimized Banner ----------------------------
  if (minimized) {
    return <PromoBannerMinimized onRestore={handleRestore} />;
  }

  // -------------------- Loading State (not minimized) ---------------
  if (loading) {
    return <PromoBannerLoading onMinimize={handleMinimize} />;
  }
  if (!ads.length) return null;
  const activeAd = ads[activeIdx];

  // -------------------- Full Banner ----------------------------
  return (
    <div
      className="fixed"
      style={{
        top: "3.5rem", // Move down below the flag toggle for visibility!
        left: 0,
        right: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "center",
        width: "100%",
        pointerEvents: "auto",
        animation: "fade-slide .3s",
        transition: "opacity .3s"
      }}
    >
      <div
        className="relative min-h-[140px] w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden glass-panel flex items-center"
        style={{
          background: `linear-gradient(90deg, ${activeAd.gradient.join(",")})`,
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.2)"
        }}
      >
        {/* Minimize Button */}
        <button 
          className="absolute top-2 right-2 bg-white/40 hover:bg-white/70 rounded-full p-1 transition-all flex items-center z-10" 
          onClick={handleMinimize} 
          aria-label="Minimize promotion banner" 
          style={{ lineHeight: 0 }}
        >
          <Minus className="w-5 h-5 text-white" aria-hidden="true" focusable="false" />
        </button>

        {/* Left arrow */}
        <button 
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/60 rounded-full p-2 shadow transition-all" 
          onClick={handlePrev} 
          tabIndex={0} 
          aria-label="Previous promotion"
        >
          <ArrowLeft className="w-6 h-6 text-white drop-shadow" aria-hidden="true" focusable="false" />
        </button>

        {/* Banner Content */}
        <div className="flex-1 min-w-0 text-center sm:text-left px-12">
          <div className="text-white font-bold text-lg animate-fade-slide shimmer">
            {activeAd.headline}
          </div>
          <div className="text-white/90 text-sm mt-1 line-clamp-2">
            {activeAd.description}
          </div>
        </div>

        {/* Right arrow */}
        <button 
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/60 rounded-full p-2 shadow transition-all" 
          onClick={handleNext} 
          tabIndex={0} 
          aria-label="Next promotion"
        >
          <ArrowRight className="w-6 h-6 text-white drop-shadow" aria-hidden="true" focusable="false" />
        </button>

        {/* Pager Indicators */}
        <div className="absolute bottom-3 left-1/2 z-20 flex gap-2 -translate-x-1/2">
          {ads.map((_, i) => (
            <span 
              key={i} 
              className={`w-2.5 h-2.5 rounded-full transition-all duration-200 border border-white/40 cursor-pointer
                ${i === activeIdx ? "bg-white/90 shadow-xl scale-110" : "bg-white/40"}`} 
              onClick={() => setActiveIdx(i)}
              aria-label={i === activeIdx ? "Current promotion indicator" : "Inactive promotion indicator"} 
              role="button" 
              tabIndex={0}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromoBanner;
