
import React from "react";
import { ChevronDown } from "lucide-react";

interface PromoBannerMinimizedProps {
  onRestore: () => void;
}

const PromoBannerMinimized: React.FC<PromoBannerMinimizedProps> = ({ onRestore }) => (
  <div
    className="fixed top-4 left-0 right-0 z-50 flex justify-center w-full pointer-events-auto animate-fade-slide"
    style={{ transition: "opacity .3s", cursor: "pointer" }}
    aria-label="Promotion Banner Minimized"
    onClick={onRestore}
    tabIndex={0}
    role="button"
    onKeyDown={e => {
      if (e.key === "Enter" || e.key === " ") onRestore();
    }}
  >
    <div className="min-h-[32px] max-w-2xl w-full rounded-2xl shadow-xl overflow-hidden glass-panel flex items-center justify-between px-4">
      <span className="truncate text-white/80 text-sm py-1">
        🎉 Promo hidden – tap to show for more deals!
      </span>
      <button
        className="ml-2 bg-white/40 hover:bg-white/70 rounded-full p-1 transition-all flex items-center"
        onClick={e => {
          e.stopPropagation();
          onRestore();
        }}
        aria-label="Show promotion banner"
        tabIndex={-1}
      >
        <ChevronDown className="w-6 h-6 text-indigo-700" aria-hidden="true" focusable="false" />
      </button>
    </div>
  </div>
);

export default PromoBannerMinimized;
