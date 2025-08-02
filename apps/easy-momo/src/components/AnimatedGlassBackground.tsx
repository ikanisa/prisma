
import React from "react";

/**
 * @deprecated This component is now replaced by the global liquid-theme CSS classes.
 * Use className="liquid-theme" with className="liquid-bg" instead.
 */
const AnimatedGlassBackground: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className = "", children }) => {
  console.warn('AnimatedGlassBackground is deprecated. Use liquid-theme CSS classes instead.');
  
  return (
    <div className={`liquid-theme ${className}`} aria-hidden="true">
      <div className="liquid-bg" />
      {children}
    </div>
  );
};

export default AnimatedGlassBackground;
