
// Universal USSD code handling utilities for multiple countries and providers
export interface UssdPattern {
  name: string;
  country: string;
  provider: string;
  pattern: RegExp;
  description: string;
}

export interface UssdValidationResult {
  isValid: boolean;
  pattern?: UssdPattern;
  sanitized: string;
  country?: string;
  provider?: string;
  type?: string;
}

// Comprehensive USSD patterns for different countries and providers
export const USSD_PATTERNS: UssdPattern[] = [
  // Rwanda MTN MoMo
  {
    name: 'rwanda_mtn_phone',
    country: 'Rwanda',
    provider: 'MTN',
    pattern: /^\*182\*1\*1\*\d{9}\*\d{3,}#$/,
    description: 'Rwanda MTN MoMo - Phone Number Payment'
  },
  {
    name: 'rwanda_mtn_code',
    country: 'Rwanda',
    provider: 'MTN',
    pattern: /^\*182\*8\*1\*\d{4,6}\*\d{3,}#$/,
    description: 'Rwanda MTN MoMo - Agent Code Payment'
  },
  // Uganda MTN
  {
    name: 'uganda_mtn',
    country: 'Uganda',
    provider: 'MTN',
    pattern: /^\*165\*\d+\*\d+#$/,
    description: 'Uganda MTN Mobile Money'
  },
  // Kenya Safaricom M-Pesa
  {
    name: 'kenya_mpesa',
    country: 'Kenya',
    provider: 'Safaricom',
    pattern: /^\*234\*\d+\*\d+#$/,
    description: 'Kenya M-Pesa Payment'
  },
  // South Africa MTN
  {
    name: 'south_africa_mtn',
    country: 'South Africa',
    provider: 'MTN',
    pattern: /^\*134\*\d{3,}#$/,
    description: 'South Africa MTN Mobile Money'
  },
  // Orange Money (multiple countries)
  {
    name: 'orange_money',
    country: 'Multiple',
    provider: 'Orange',
    pattern: /^\*126\*\d{3,}#$/,
    description: 'Orange Money Service'
  },
  // Airtel Money
  {
    name: 'airtel_money',
    country: 'Multiple',
    provider: 'Airtel',
    pattern: /^\*144\*\d{3,}#$/,
    description: 'Airtel Money Service'
  },
  // Ghana MTN
  {
    name: 'ghana_mtn',
    country: 'Ghana',
    provider: 'MTN',
    pattern: /^\*170\*\d+#$/,
    description: 'Ghana MTN Mobile Money'
  },
  // Nigeria GTBank
  {
    name: 'nigeria_gtbank',
    country: 'Nigeria',
    provider: 'GTBank',
    pattern: /^\*737\*\d+#$/,
    description: 'Nigeria GTBank USSD'
  },
  // Generic USSD pattern (fallback)
  {
    name: 'generic_ussd',
    country: 'Unknown',
    provider: 'Unknown',
    pattern: /^\*\d{2,4}\*.*#$/,
    description: 'Generic USSD Code'
  }
];

/** Remove any tel: prefix and URI-decode the payload */
export function stripTelPrefix(str: string): string {
  const cleaned = str.toLowerCase().startsWith('tel:')
    ? str.slice(4)
    : str;
  return decodeURIComponent(cleaned);
}

/** Final normalisation pipeline - preserve complete USSD codes */
export function normaliseUssd(input: string): string {
  console.log('normaliseUssd input:', input);
  
  // First strip tel: prefix and decode
  let ussd = stripTelPrefix(input).trim();
  console.log('After stripTelPrefix:', ussd);
  
  // Remove any whitespace but preserve the structure
  ussd = ussd.replace(/\s+/g, '');
  console.log('After whitespace removal:', ussd);
  
  // Ensure it ends with # if it doesn't already
  if (!ussd.endsWith('#')) {
    ussd += '#';
  }
  
  console.log('Final normalized USSD:', ussd);
  return ussd;
}

export function sanitizeUssd(raw: string): string {
  if (!raw) return '';
  return raw.trim().replace(/\s+/g, '');
}

export function ensureTrailingHash(ussd: string): string {
  return ussd.endsWith('#') ? ussd : ussd + '#';
}

export function encodeUssdForTel(ussd: string): string {
  return `tel:${encodeURIComponent(ussd)}`;
}

export function validateUniversalUssd(rawUssd: string): UssdValidationResult {
  console.log('validateUniversalUssd input:', rawUssd);
  
  // First normalize the input (strip tel: prefix, decode URI, ensure trailing #)
  const sanitized = normaliseUssd(rawUssd);
  console.log('validateUniversalUssd sanitized:', sanitized);
  
  // Basic format check
  if (!sanitized.startsWith('*') || !sanitized.includes('#')) {
    console.log('Failed basic format check');
    return {
      isValid: false,
      sanitized,
    };
  }

  // Find matching pattern
  for (const pattern of USSD_PATTERNS) {
    if (pattern.pattern.test(sanitized)) {
      console.log('Matched pattern:', pattern.name);
      return {
        isValid: true,
        pattern,
        sanitized,
        country: pattern.country,
        provider: pattern.provider,
        type: pattern.name
      };
    }
  }

  // If no specific pattern matches but it looks like USSD, accept it
  if (sanitized.length > 5 && sanitized.includes('*')) {
    console.log('Accepted as generic USSD');
    return {
      isValid: true,
      sanitized,
      country: 'Unknown',
      provider: 'Unknown',
      type: 'generic'
    };
  }

  console.log('Failed validation');
  return {
    isValid: false,
    sanitized,
  };
}

export function extractUssdFromQR(qrData: string): string | null {
  console.log('extractUssdFromQR input:', qrData);
  
  // First normalize to handle tel: prefixes
  const normalized = normaliseUssd(qrData);
  console.log('extractUssdFromQR normalized:', normalized);
  
  // If the normalized data already looks like a complete USSD, return it
  if (normalized.startsWith('*') && normalized.includes('#')) {
    console.log('Returning complete USSD:', normalized);
    return normalized;
  }
  
  // Try to find USSD pattern in normalized data as fallback
  const ussdMatch = normalized.match(/\*\d{2,4}\*[^*]*#/);
  const result = ussdMatch ? ussdMatch[0] : normalized;
  console.log('extractUssdFromQR result:', result);
  
  return result;
}

export function getUssdDisplayInfo(validation: UssdValidationResult): {
  title: string;
  subtitle: string;
  color: string;
} {
  if (!validation.isValid) {
    return {
      title: 'Invalid USSD Code',
      subtitle: 'Please scan a valid mobile money QR code',
      color: 'text-red-400'
    };
  }

  if (validation.country === 'Unknown') {
    return {
      title: 'USSD Code Detected',
      subtitle: 'Tap to launch dialer',
      color: 'text-yellow-400'
    };
  }

  return {
    title: `${validation.provider} ${validation.country}`,
    subtitle: validation.pattern?.description || 'Mobile Money Payment',
    color: 'text-green-400'
  };
}
