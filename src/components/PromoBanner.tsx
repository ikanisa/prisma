
import React, { useEffect, useState, useRef } from "react";
import { fetchAds } from "@/services/firestore";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "./ui/carousel";
import { Button } from "./ui/button";

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

const DUMMY_AD: Ad = {
  id: "dummy1",
  headline: "🎉 Enjoy Zero Fees!",
  description: "Pay & get paid instantly through Mobile Money. No fees, no hassle—try it now!",
  ctaLabel: "Get Started",
  ctaLink: "#",
  gradient: ["#396afc", "#2948ff", "#AD00FF"],
  imageUrl: "", // optional: can place a placeholder img here
};

const PromoBanner: React.FC = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let running = true;
    fetchAds()
      .then((fetchedAds) => {
        if (!running) return;
        if (fetchedAds && fetchedAds.length) {
          setAds(fetchedAds as Ad[]);
        } else {
          setAds([DUMMY_AD]);
        }
        setLoading(false);
      })
      .catch(() => {
        if (running) {
          setAds([DUMMY_AD]);
          setLoading(false);
        }
      });
    return () => {
      running = false;
    };
  }, []);

  useEffect(() => {
    // Rotate
    if (ads.length === 0) return;
    timerRef.current = setInterval(() => {
      setActiveIdx(idx => (idx + 1) % ads.length);
    }, ROTATE_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ads]);

  const handlePrev = () => {
    setActiveIdx(idx => (idx - 1 + ads.length) % ads.length);
    if (timerRef.current) clearInterval(timerRef.current);
  };
  const handleNext = () => {
    setActiveIdx(idx => (idx + 1) % ads.length);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // VISUAL: Always show a glassy animated dummy if loading, no spinner/block.
  if (loading) {
    return (
      <div
        className="fixed top-4 left-0 right-0 z-50 flex justify-center w-full pointer-events-auto animate-fade-slide"
        style={{ transition: "opacity .3s" }}
      >
        <div
          className="relative min-h-[120px] w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden glass-panel flex items-center"
          style={{
            background: `linear-gradient(90deg, ${DUMMY_AD.gradient.join(",")})`,
          }}
        >
          {/* Left arrow (hidden while loading/dummy) */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 pointer-events-none" />
          {/* Banner Content */}
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-5 py-5 px-4">
            <div className="w-20 h-20 rounded-xl bg-white/30 flex items-center justify-center shimmer font-bold text-4xl select-none text-indigo-700 shadow">
              💸
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="text-white font-bold text-lg animate-fade-slide shimmer">
                {DUMMY_AD.headline}
              </div>
              <div className="text-white/90 text-sm mt-1 line-clamp-2">
                {DUMMY_AD.description}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4 glow pointer-events-none opacity-80"
                disabled
              >
                {DUMMY_AD.ctaLabel}
              </Button>
            </div>
          </div>
          {/* Right arrow (also hidden while loading/dummy) */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 pointer-events-none" />
        </div>
      </div>
    );
  }
  if (!ads.length) return null;

  const activeAd = ads[activeIdx];

  return (
    <div
      className={`fixed top-4 left-0 right-0 z-50 flex justify-center w-full pointer-events-auto animate-fade-slide`}
      style={{ transition: "opacity .3s" }}
    >
      <div
        className="relative min-h-[120px] w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden glass-panel flex items-center"
        style={{
          background: `linear-gradient(90deg, ${activeAd.gradient.join(",")})`,
        }}
      >

        {/* Left arrow */}
        <button
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/60 rounded-full p-2 shadow transition-all"
          onClick={handlePrev}
          tabIndex={0}
          aria-label="Previous promotion"
        >
          <ArrowLeft className="w-6 h-6 text-white drop-shadow" />
        </button>

        {/* Banner Content */}
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-5 py-5 px-4">
          {activeAd.imageUrl ? (
            <img
              src={activeAd.imageUrl}
              alt="Promo"
              className="w-20 h-20 rounded-xl object-cover bg-white/20 shadow-lg shimmer"
              style={{ flexShrink: 0 }}
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-white/30 flex items-center justify-center shimmer font-bold text-4xl select-none text-indigo-700 shadow">
              💸
            </div>
          )}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="text-white font-bold text-lg animate-fade-slide shimmer">
              {activeAd.headline}
            </div>
            <div className="text-white/90 text-sm mt-1 line-clamp-2">
              {activeAd.description}
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 glow hover:scale-110"
              onClick={() => window.open(activeAd.ctaLink, "_blank")}
            >
              {activeAd.ctaLabel}
            </Button>
          </div>
        </div>

        {/* Right arrow */}
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/60 rounded-full p-2 shadow transition-all"
          onClick={handleNext}
          tabIndex={0}
          aria-label="Next promotion"
        >
          <ArrowRight className="w-6 h-6 text-white drop-shadow" />
        </button>

        {/* Pager Indicators */}
        <div className="absolute bottom-3 left-1/2 z-20 flex gap-2 -translate-x-1/2">
          {ads.map((_, i) => (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-200 border border-white/40
                ${i === activeIdx ? "bg-white/90 shadow-xl scale-110" : "bg-white/40"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromoBanner;

