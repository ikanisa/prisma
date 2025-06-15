
import React from "react";
import { getLocale, setLocale } from "@/i18n";

const langs = [
  { code: "rw", emoji: "🇷🇼", aria: "Kinyarwanda" },
  { code: "en", emoji: "🇬🇧", aria: "English" },
  { code: "fr", emoji: "🇫🇷", aria: "Français" },
];

const LanguageToggle: React.FC = () => {
  const current = getLocale();

  return (
    <div className="fixed z-[220] top-3 right-3 flex gap-2 items-center bg-white/60 dark:bg-gray-800/80 rounded-xl p-1 px-2 shadow-lg transition-all backdrop-blur-lg">
      {langs.map(lang => (
        <button
          key={lang.code}
          onClick={() => setLocale(lang.code as any)}
          aria-pressed={current === lang.code}
          aria-label={lang.aria}
          className={`p-1 rounded-full hover:bg-blue-300/20 dark:hover:bg-yellow-400/20 transition
            ${current === lang.code ? "ring-2 ring-blue-500 dark:ring-yellow-400 ring-offset-2" : ""}
          `}
        >
          <span
            className={`text-2xl 
              ${current === lang.code ? "scale-125 drop-shadow" : "opacity-60"}
              transition-transform
            `}
            role="img"
            aria-label={lang.aria}
          >
            {lang.emoji}
          </span>
        </button>
      ))}
    </div>
  );
};
export default LanguageToggle;
