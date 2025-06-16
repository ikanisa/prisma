
import React, { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { getLocale, setLocale } from "@/i18n";
import { cn } from "@/lib/utils";
import CountryFlag from "./CountryFlag";

// Only ISO codes for country flags
const LANGUAGE_FLAGS: Record<string, "en" | "rw" | "fr"> = {
  en: "en",
  rw: "rw",
  fr: "fr",
};

// Temporarily locked to English only
const SUPPORTED_LANGUAGES = [
  { code: "en" },
  // { code: "rw" },
  // { code: "fr" },
  // Extend here for more when ready
];

const LanguageToggle: React.FC = () => {
  const [open, setOpen] = useState(false);

  // Force English for now
  const currentLang = "en";
  const activeLang = SUPPORTED_LANGUAGES[0]; // Always English
  const otherLangs: any[] = []; // No other languages available

  const handleSelect = (code: string) => {
    // Disabled for now - only English allowed
    // setLocale(code as any);
    // setOpen(false);
  };

  return (
    <div
      className="fixed z-[220] top-3 right-3 flex gap-2 items-center bg-white/60 dark:bg-gray-800/80 rounded-xl p-1 px-2 shadow-lg transition-all backdrop-blur-lg"
      tabIndex={0}
      onBlur={() => setTimeout(() => setOpen(false), 120)}
    >
      <button
        className={cn(
          "flex items-center gap-1 px-1 h-7 rounded hover:bg-white/80 dark:hover:bg-gray-900/80 transition-colors focus:outline-none cursor-not-allowed opacity-75",
          open && "bg-white dark:bg-gray-900"
        )}
        aria-haspopup="listbox"
        aria-expanded={false}
        onClick={() => {}} // Disabled
        tabIndex={0}
        style={{ minWidth: 26, minHeight: 26, padding: 0 }}
        title="Language locked to English (other languages coming soon)"
        disabled
      >
        {/* Actual flag SVG, very small */}
        <CountryFlag code={LANGUAGE_FLAGS[activeLang.code] || "en"} size={18} />
        <ChevronDown className="w-3 h-3 ml-0.5 opacity-50" aria-hidden />
      </button>
      {/* Dropdown disabled - no other languages shown */}
    </div>
  );
};

export default LanguageToggle;
