
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

/** Final normalisation pipeline */
export function normaliseUssd(input: string): string {
  let ussd = stripTelPrefix(input).trim().replace(/\s+/g, '');
  if (!ussd.endsWith('#')) ussd += '#';
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
  // First normalize the input (strip tel: prefix, decode URI, ensure trailing #)
  const sanitized = normaliseUssd(rawUssd);
  
  // Basic format check
  if (!sanitized.startsWith('*') || !sanitized.includes('#')) {
    return {
      isValid: false,
      sanitized,
    };
  }

  // Find matching pattern
  for (const pattern of USSD_PATTERNS) {
    if (pattern.pattern.test(sanitized)) {
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
    return {
      isValid: true,
      sanitized,
      country: 'Unknown',
      provider: 'Unknown',
      type: 'generic'
    };
  }

  return {
    isValid: false,
    sanitized,
  };
}

export function extractUssdFromQR(qrData: string): string | null {
  // First normalize to handle tel: prefixes
  const normalized = normaliseUssd(qrData);
  
  // Try to find USSD pattern in normalized data
  const ussdMatch = normalized.match(/\*\d{2,4}\*[^*]*#/);
  return ussdMatch ? ussdMatch[0] : normalized;
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
