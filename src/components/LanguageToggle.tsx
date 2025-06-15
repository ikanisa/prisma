
import React, { useState } from "react";
import {
  Flag,
  FlagTriangleLeft,
  FlagTriangleRight,
  FlagOff,
  ChevronDown,
  Check,
} from "lucide-react";
import { getLocale, setLocale } from "@/i18n";
import { cn } from "@/lib/utils";

// Assign "flag" icons for each language
const LANGUAGE_FLAGS: Record<string, React.ComponentType<{ className?: string }>> = {
  en: Flag,
  rw: FlagTriangleLeft,
  fr: FlagTriangleRight,
  // Add more mappings if you add more supported languages
};

const SUPPORTED_LANGUAGES = [
  { code: "en" },
  { code: "rw" },
  { code: "fr" },
  // Extend here for more
];

const LanguageToggle: React.FC = () => {
  const [open, setOpen] = useState(false);

  const currentLang = getLocale();
  const activeLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) ||
    SUPPORTED_LANGUAGES[0];
  const otherLangs = SUPPORTED_LANGUAGES.filter((l) => l.code !== activeLang.code);

  const handleSelect = (code: string) => {
    setLocale(code as any);
    setOpen(false);
  };

  // Lookup icon component
  const ActiveFlag = LANGUAGE_FLAGS[activeLang.code] || Flag;

  return (
    <div
      className="fixed z-[220] top-3 right-3 flex gap-2 items-center bg-white/60 dark:bg-gray-800/80 rounded-xl p-1 px-2 shadow-lg transition-all backdrop-blur-lg"
      tabIndex={0}
      onBlur={() => setTimeout(() => setOpen(false), 120)}
    >
      <button
        className={cn(
          "flex items-center gap-1 px-1 h-7 rounded hover:bg-white/80 dark:hover:bg-gray-900/80 transition-colors",
          open && "bg-white dark:bg-gray-900"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        tabIndex={0}
        style={{ minWidth: 30, minHeight: 30 }}
      >
        <ActiveFlag className="w-4 h-4" aria-label={activeLang.code} />
        <ChevronDown className="w-3 h-3 ml-0.5" aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 min-w-[40px] rounded-xl shadow-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-fade-in">
          {otherLangs.map((lang) => {
            const FlagIcon = LANGUAGE_FLAGS[lang.code] || FlagOff;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={cn(
                  "w-full px-2 py-2 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors flex items-center justify-center",
                  lang.code === currentLang && "bg-indigo-50 dark:bg-indigo-950"
                )}
                aria-selected={lang.code === currentLang}
                style={{ minWidth: 32, minHeight: 32 }}
              >
                <FlagIcon className="w-4 h-4" aria-label={lang.code} />
                {lang.code === currentLang && (
                  <Check className="w-3 h-3 text-indigo-500 ml-1" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageToggle;
