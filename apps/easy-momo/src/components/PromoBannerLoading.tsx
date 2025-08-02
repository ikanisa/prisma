
import React from "react";
import { Minus } from "lucide-react";

const DUMMY_GRADIENT = ["#396afc", "#2948ff", "#AD00FF"];
const DUMMY_AD = {
  headline: "🚀 Start Scanning. No Login Needed",
  description: "Just open the app and scan. No signup, no friction.",
  ctaLabel: "Start Scanning",
};

interface PromoBannerLoadingProps {
  onMinimize: () => void;
}

const PromoBannerLoading: React.FC<PromoBannerLoadingProps> = ({ onMinimize }) => (
  <div
    className="fixed top-4 left-0 right-0 z-50 flex justify-center w-full pointer-events-auto animate-fade-slide"
    style={{ transition: "opacity .3s" }}
  >
    <div
      className="relative min-h-[120px] w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden glass-panel flex items-center"
      style={{
        background: `linear-gradient(90deg, ${DUMMY_GRADIENT.join(",")})`,
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.2)"
      }}
    >
      {/* Minimize Button */}
      <button
        className="absolute top-2 right-2 bg-white/40 hover:bg-white/70 rounded-full p-1 transition-all flex items-center z-10"
        onClick={onMinimize}
        aria-label="Minimize promotion banner"
        style={{ lineHeight: 0 }}
      >
        <Minus className="w-5 h-5 text-white" aria-hidden="true" focusable="false" />
      </button>

      {/* Banner Content */}
      <div className="flex-1 flex flex-col sm:flex-row items-center gap-5 py-5 px-4">
        <div className="w-20 h-20 rounded-xl bg-white/30 flex items-center justify-center shimmer font-bold text-4xl select-none text-indigo-700 shadow">
          🚀
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="text-white font-bold text-lg animate-fade-slide shimmer">
            {DUMMY_AD.headline}
          </div>
          <div className="text-white/90 text-sm mt-1 line-clamp-2">
            {DUMMY_AD.description}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default PromoBannerLoading;
