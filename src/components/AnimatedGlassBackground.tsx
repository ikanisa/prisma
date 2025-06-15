
import React from "react";

const AnimatedGlassBackground: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className = "", children }) => (
  <div className={`fixed inset-0 w-full h-full z-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
    {/* Animated fluid gradient background */}
    <div className="absolute inset-0 w-full h-full animated-liquid-bg dark:opacity-90 opacity-100" />
    {/* Optional SVG bubbles/glow for added polish */}
    <svg className="absolute inset-0 w-full h-full pointer-events-none" width="100%" height="100%" viewBox="0 0 600 800" fill="none" style={{ filter: "blur(10px)" }}>
      <ellipse cx="80" cy="160" rx="80" ry="100" fill="#6a00f4" fillOpacity="0.11">
        <animate attributeName="cy" values="160;320;160" dur="10s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="500" cy="640" rx="84" ry="128" fill="#00c853" fillOpacity="0.11">
        <animate attributeName="cy" values="680;600;680" dur="16s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="320" cy="350" rx="140" ry="90" fill="#AD00FF" fillOpacity="0.10">
        <animate attributeName="cx" values="300;340;300" dur="18s" repeatCount="indefinite" />
      </ellipse>
    </svg>
    {children}
  </div>
);

export default AnimatedGlassBackground;
