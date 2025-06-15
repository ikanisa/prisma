
import en from './en.json';
// import fr from './fr.json'; // unused, and causes type errors due to structure mismatch
import rw from './rw.json';
// import pt from './pt.json'; // unused, and causes type errors due to structure mismatch

type LangCode = 'en' | 'fr' | 'rw' | 'pt';
type TranslationDict = typeof en;

// Only include languages with complete structures
const translations: Record<LangCode, TranslationDict> = {
  en,
  // fr, // DO NOT include fr until structure is complete
  rw,
  // pt, // DO NOT include pt until structure is complete
};

function getBrowserLang(): LangCode {
  if (typeof navigator === 'undefined') return 'en';
  const lang = (navigator.language || navigator.languages?.[0] || 'en').slice(0, 2).toLowerCase();
  if (['rw', 'en'].includes(lang)) return lang as LangCode;
  return 'en';
}

function getFirebaseLang(): LangCode | null {
  // Placeholder: Integrate with Firebase user profile if needed
  // e.g., return (firebase.auth().currentUser?.langPref as LangCode) ?? null
  return null;
}

export function getStoredLang(): LangCode | null {
  const val = localStorage.getItem('locale');
  if (['rw', 'en'].includes(val ?? '')) return val as LangCode;
  return null;
}

let _cached: LangCode | null = null;

export function detectLang(): LangCode {
  if (_cached) return _cached;
  const fromStore = getStoredLang();
  if (fromStore) return (_cached = fromStore);

  const firebaseLang = getFirebaseLang();
  if (firebaseLang) return (_cached = firebaseLang);

  const browserLang = getBrowserLang();
  return (_cached = browserLang);
}

export function t(
  key: string,
  vars?: Record<string, string | number>,
  fallbackLang: LangCode = 'en'
): string {
  const lang = detectLang();
  let str = getFromPath(translations[lang], key);
  if (!str) {
    str = getFromPath(translations[fallbackLang], key, key);
  }
  return interpolate(str, vars);
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
    typeof vars[key] !== 'undefined' ? String(vars[key]) : `{{${key}}}`
  );
}

function getFromPath(obj: any, path: string, fallback?: string): string {
  const val = path.split('.').reduce((a, b) => (a && a[b]) ? a[b] : undefined, obj);
  return (val !== undefined) ? val : fallback || path;
}

export function setLocale(lang: LangCode) {
  localStorage.setItem('locale', lang);
  window.location.reload();
}

export function getLocale(): LangCode {
  return detectLang();
}

