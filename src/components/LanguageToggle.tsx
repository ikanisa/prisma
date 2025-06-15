
import React, { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { getLocale, setLocale } from "@/i18n";
import { cn } from "@/lib/utils";

// Supported languages (matching your app)
const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "rw", label: "Kinyarwanda" },
  { code: "fr", label: "Français" },
  // Note: "pt" structure is incomplete - should be omitted if not fully supported.
];

const LanguageToggle: React.FC = () => {
  const [open, setOpen] = useState(false);

  const currentLang = getLocale();
  const activeLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];
  const otherLangs = SUPPORTED_LANGUAGES.filter((l) => l.code !== activeLang.code);

  const handleSelect = (code: string) => {
    setLocale(code as any);
    setOpen(false);
  };

  return (
    <div
      className="fixed z-[220] top-3 right-3 flex gap-2 items-center bg-white/60 dark:bg-gray-800/80 rounded-xl p-1 px-2 shadow-lg transition-all backdrop-blur-lg"
      tabIndex={0}
      onBlur={() => setTimeout(() => setOpen(false), 120)}
    >
      <button
        className={cn(
          "flex items-center gap-1 font-semibold px-2 h-8 rounded hover:bg-white/80 dark:hover:bg-gray-900/80 transition-colors",
          open && "bg-white dark:bg-gray-900"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        tabIndex={0}
      >
        <span>{activeLang.label}</span>
        <ChevronDown className="w-4 h-4 ml-1" aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 min-w-[160px] rounded-xl shadow-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-fade-in">
          {otherLangs.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={cn(
                "w-full px-4 py-2 text-left hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors flex items-center gap-2",
                lang.code === currentLang && "font-bold bg-indigo-50 dark:bg-indigo-950"
              )}
              aria-selected={lang.code === currentLang}
            >
              <span>{lang.label}</span>
              {lang.code === currentLang && (
                <Check className="w-4 h-4 text-indigo-500 ml-auto" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageToggle;
