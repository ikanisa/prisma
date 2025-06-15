
import React from "react";
import { t, getLocale, setLocale } from "@/i18n";

const langs = [
  { code: "rw", label: "🇷🇼 Kinyarwanda" },
  { code: "en", label: "🇬🇧 English" }
];

const LanguageToggle: React.FC = () => {
  const current = getLocale();
  return (
    <div className="fixed z-[220] top-3 right-3 flex gap-2 items-center bg-white/60 dark:bg-gray-800/80 rounded-xl p-1 px-2 shadow-lg transition-all backdrop-blur-lg">
      {langs.map(lang =>
        <button
          key={lang.code}
          onClick={() => setLocale(lang.code as any)}
          className={`px-2 py-0.5 rounded font-bold text-sm hover:bg-blue-400/20 transition ${
            current === lang.code ? "bg-blue-600 text-white" : "text-gray-900 dark:text-gray-100"
          }`}
          aria-pressed={current === lang.code}
        >
          {lang.label}
        </button>
      )}
    </div>
  );
};
export default LanguageToggle;
