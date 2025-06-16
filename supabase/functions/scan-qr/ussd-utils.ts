
import { USSD_PATTERNS } from './ussd-patterns.ts';
import { ValidationResult } from './types.ts';

/** Remove any tel: prefix and URI-decode the payload */
export function stripTelPrefix(str: string): string {
  const cleaned = str.toLowerCase().startsWith('tel:')
    ? str.slice(4)
    : str;
  return decodeURIComponent(cleaned);
}

/** Final normalisation pipeline */
export function normaliseUssd(input: string): string {
  let ussd = stripTelPrefix(input).trim().replace(/\s+/g, '');
  if (!ussd.endsWith('#')) ussd += '#';
  return ussd;
}

export function validateUssdPattern(rawUssd: string): ValidationResult {
  // Normalize the input first
  const ussd = normaliseUssd(rawUssd);
  
  for (const pattern of USSD_PATTERNS) {
    if (pattern.pattern.test(ussd)) {
      return {
        isValid: true,
        country: pattern.country,
        provider: pattern.provider,
        patternType: pattern.name,
        confidence: 0.95,
        sanitized: ussd
      };
    }
  }
  
  // Generic USSD validation
  if (ussd.startsWith('*') && ussd.includes('#') && ussd.length > 5) {
    return {
      isValid: true,
      country: 'Unknown',
      provider: 'Unknown',
      patternType: 'generic',
      confidence: 0.6,
      sanitized: ussd
    };
  }
  
  return {
    isValid: false,
    country: null,
    provider: null,
    patternType: null,
    confidence: 0.1,
    sanitized: ussd
  };
}

export function extractPaymentDetails(ussdCode: string): { receiver?: string; amount?: string } {
  const ussdMatch = ussdCode.match(/\*182\*[18]\*1\*(\d+)\*(\d+)#/) ||
                   ussdCode.match(/\*165\*(\d+)\*(\d+)#/) ||
                   ussdCode.match(/\*234\*(\d+)\*(\d+)#/) ||
                   ussdCode.match(/\*144\*(\d+)\*(\d+)#/);
  
  if (ussdMatch) {
    const [, receiver, amount] = ussdMatch;
    return { receiver, amount };
  }
  
  return {};
}
