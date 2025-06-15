
import React from "react";

// Use accessible SVGs for each supported flag.
type CountryCode = "en" | "rw" | "fr";

interface CountryFlagProps {
  code: CountryCode;
  size?: number; // px
  className?: string;
}

const FLAG_SVGS: Record<CountryCode, JSX.Element> = {
  // "en" - United Kingdom (default, as generic English)
  en: (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-label="UK Flag" xmlns="http://www.w3.org/2000/svg">
      <rect width="18" height="12" rx="2" fill="#00247D"/>
      <path d="M0 0L18 12M18 0L0 12" stroke="white" strokeWidth="2"/>
      <rect y="5" width="18" height="2" fill="white"/>
      <rect x="8" width="2" height="12" fill="white"/>
      <rect y="5.5" width="18" height="1" fill="#CF142B"/>
      <rect x="8.5" width="1" height="12" fill="#CF142B"/>
    </svg>
  ),
  // "rw" - Rwanda
  rw: (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-label="Rwanda Flag" xmlns="http://www.w3.org/2000/svg">
      <rect width="18" height="12" rx="2" fill="#338AF3"/>
      <rect y="6" width="18" height="3" fill="#FFDA44"/>
      <rect y="9" width="18" height="3" fill="#496E2D"/>
      <circle cx="14.5" cy="3.5" r="2" fill="#FFDA44"/>
      <g>
        <g>
          <circle cx="14.5" cy="3.5" r="0.7" fill="#338AF3"/>
        </g>
        <g>
          {[...Array(12).keys()].map(i => 
            <rect
              key={i}
              x={14.5 - 0.07}
              y={3.5 - 2}
              width="0.14"
              height="0.7"
              fill="#FFDA44"
              rx="0.03"
              transform={`rotate(${i * 30} 14.5 3.5)`}
            />
          )}
        </g>
      </g>
    </svg>
  ),
  // "fr" - France
  fr: (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-label="France Flag" xmlns="http://www.w3.org/2000/svg">
      <rect width="6" height="12" fill="#0052B4"/>
      <rect x="6" width="6" height="12" fill="#fff"/>
      <rect x="12" width="6" height="12" fill="#D80027"/>
    </svg>
  ),
};

const CountryFlag: React.FC<CountryFlagProps> = ({ code, size = 18, className }) => {
  const svg = FLAG_SVGS[code] || FLAG_SVGS["en"];
  return (
    <span
      className={className}
      // Use inline style to scale SVG for consistent sizing
      style={{ display: "inline-block", width: size, height: size * 12 / 18, minWidth: size }}
      aria-hidden="true"
    >
      {svg}
    </span>
  );
};

export default CountryFlag;
