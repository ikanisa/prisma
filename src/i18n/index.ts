
import en from './en.json';
import fr from './fr.json';
import rw from './rw.json';
import pt from './pt.json';

type LangCode = 'en' | 'fr' | 'rw' | 'pt';
type TranslationDict = typeof en;

const translations: Record<LangCode, TranslationDict> = { en, fr, rw, pt };

// Always use Kinyarwanda for the app
function detectLang(): LangCode {
  return 'rw';
}

/**
 * Usage: t('key.sub', { dynamic: 'foo' })
 */
function interpolate(template: string, vars?: Record<string, string|number>) {
  if (!vars) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
    typeof vars[key] !== 'undefined' ? String(vars[key]) : `{{${key}}}`
  );
}

function getFromPath(obj: any, path: string, fallback?: string): string {
  const val = path.split('.').reduce((a, b) => (a && a[b]) ? a[b] : undefined, obj);
  return (val !== undefined) ? val : fallback || path;
}

export function t(key: string, vars?: Record<string, string|number>, fallbackLang: LangCode = 'en'): string {
  const lang = detectLang();
  let str = getFromPath(translations[lang], key);
  if (!str) {
    // Fallback
    str = getFromPath(translations[fallbackLang], key, key);
  }
  return interpolate(str, vars);
}

export function setLocale(lang: LangCode) {
  localStorage.setItem('locale', lang);
  window.location.reload();
}

export function getLocale(): LangCode {
  return detectLang();
}

