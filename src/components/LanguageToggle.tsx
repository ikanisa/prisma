
import React from "react";
import { Flag } from "lucide-react";
import { getLocale, setLocale } from "@/i18n";

const langs = [
  { code: "rw", color: "#FFD600", "aria": "Kinyarwanda" },
  { code: "en", color: "#3776f0", "aria": "English" }
];

const LanguageToggle: React.FC = () => {
  const current = getLocale();

  return (
    <div className="fixed z-[220] top-3 right-3 flex gap-2 items-center bg-white/60 dark:bg-gray-800/80 rounded-xl p-1 px-2 shadow-lg transition-all backdrop-blur-lg">
      {langs.map(lang =>
        <button
          key={lang.code}
          onClick={() => setLocale(lang.code as any)}
          aria-pressed={current === lang.code}
          aria-label={lang.aria}
          className={`p-1 rounded-full hover:bg-blue-300/20 dark:hover:bg-yellow-400/20 transition
            ${current === lang.code ? "ring-2 ring-blue-500 dark:ring-yellow-400 ring-offset-2" : ""}
          `}
        >
          <Flag
            color={lang.color}
            className={`w-6 h-6
              ${current === lang.code ? "scale-125 drop-shadow" : "opacity-60"}
              transition-transform
            `}
            strokeWidth={2.5}
            fill={current === lang.code ? lang.color + "33" : "none"}
          />
        </button>
      )}
    </div>
  );
};
export default LanguageToggle;

