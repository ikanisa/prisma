// General utilities for easyMO platform

/**
 * Language detection utilities
 */
export function detectLanguage(text: string): string {
  // Simple language detection based on character patterns
  const kinyarwandaPatterns = [
    /\b(mwaramutse|muraho|ni\s+mwiza|amahirwe|kuki|nuko|ubwo|ico|uko)\b/i,
    /[aeiou]{2,}/g, // Kinyarwanda has many consecutive vowels
  ];
  
  const frenchPatterns = [
    /\b(bonjour|merci|comment|pourquoi|oui|non|avec|dans|pour)\b/i,
    /\b(ça|c'est|qu'est|n'est)\b/i,
  ];
  
  const englishPatterns = [
    /\b(hello|thank|how|why|yes|no|with|that|this|have)\b/i,
    /\b(what's|don't|can't|won't)\b/i,
  ];

  let kinyarwandaScore = 0;
  let frenchScore = 0;
  let englishScore = 0;

  // Score based on pattern matches
  kinyarwandaPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) kinyarwandaScore += matches.length;
  });

  frenchPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) frenchScore += matches.length;
  });

  englishPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) englishScore += matches.length;
  });

  // Return language with highest score, default to English
  if (kinyarwandaScore > frenchScore && kinyarwandaScore > englishScore) {
    return 'rw';
  } else if (frenchScore > englishScore) {
    return 'fr';
  } else {
    return 'en';
  }
}

/**
 * Formats currency amounts in RWF
 */
export function formatRWF(amount: number): string {
  return new Intl.NumberFormat('rw-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats phone numbers for display
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';
  
  // Remove country code for display if it's Rwanda (+250)
  if (phone.startsWith('+250')) {
    const local = phone.slice(4);
    // Format as XXX XXX XXX
    if (local.length === 9) {
      return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
    }
  }
  
  return phone;
}

/**
 * Generates unique IDs
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Safe JSON parsing with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Debounce function for rate limiting
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Truncates text to specified length
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Extracts domain from URL
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}