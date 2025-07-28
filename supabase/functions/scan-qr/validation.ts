/**
 * QR Validation Module
 * Handles validation and normalization of QR code content
 */

export interface QRValidationResult {
  isValid: boolean;
  sanitized: string;
  confidence: number;
  country?: string;
  provider?: string;
  pattern?: string;
  amount?: number;
  suggestions?: string[];
}

export function validateAndNormalizeQR(qrContent: string): QRValidationResult {
  console.log('Validating QR content:', qrContent);
  
  if (!qrContent || typeof qrContent !== 'string') {
    return {
      isValid: false,
      sanitized: '',
      confidence: 0,
      suggestions: ['Invalid QR code content']
    };
  }

  // Normalize the input - remove tel: prefix if present
  let normalized = qrContent.trim();
  if (normalized.startsWith('tel:')) {
    normalized = decodeURIComponent(normalized.substring(4));
  }

  // Remove any extra whitespace or newlines
  normalized = normalized.replace(/\s+/g, '').replace(/\n/g, '');

  console.log('Normalized QR content:', normalized);

  // Validate USSD patterns
  const ussdValidation = validateUSSDPattern(normalized);
  
  if (ussdValidation.isValid) {
    return {
      isValid: true,
      sanitized: ussdValidation.sanitized,
      confidence: ussdValidation.confidence,
      country: ussdValidation.country,
      provider: ussdValidation.provider,
      pattern: ussdValidation.pattern,
      amount: ussdValidation.amount
    };
  }

  // Try to detect and fix common issues
  const fixedResult = attemptQRFix(normalized);
  if (fixedResult.isValid) {
    return fixedResult;
  }

  return {
    isValid: false,
    sanitized: normalized,
    confidence: 0,
    suggestions: [
      'This does not appear to be a valid mobile money QR code',
      'Ensure the QR code is from a supported payment provider',
      'Try scanning the QR code again with better lighting'
    ]
  };
}

function validateUSSDPattern(content: string): QRValidationResult {
  // Rwanda Mobile Money patterns
  const rwandaPatterns = [
    // Phone number format: *182*1*1*[phone]*[amount]#
    {
      regex: /^\*182\*1\*1\*(\d{10})\*(\d+)#$/,
      country: 'Rwanda',
      provider: 'Mobile Money',
      pattern: 'phone_number',
      confidence: 0.95
    },
    // Agent code format: *182*8*1*[code]*[amount]#
    {
      regex: /^\*182\*8\*1\*(\d{4,6})\*(\d+)#$/,
      country: 'Rwanda',
      provider: 'Mobile Money',
      pattern: 'agent_code',
      confidence: 0.95
    },
    // Generic Rwanda format: *182*[anything]*[amount]#
    {
      regex: /^\*182\*.*\*(\d+)#$/,
      country: 'Rwanda',
      provider: 'Mobile Money',
      pattern: 'generic',
      confidence: 0.8
    }
  ];

  // Kenya patterns
  const kenyaPatterns = [
    {
      regex: /^\*234\*(\d+)\*(\d+)#$/,
      country: 'Kenya',
      provider: 'Equity Bank',
      pattern: 'equity_bank',
      confidence: 0.9
    }
  ];

  // Uganda patterns
  const ugandaPatterns = [
    {
      regex: /^\*165\*(\d+)\*(\d+)#$/,
      country: 'Uganda',
      provider: 'Mobile Money',
      pattern: 'airtel_money',
      confidence: 0.9
    }
  ];

  const allPatterns = [...rwandaPatterns, ...kenyaPatterns, ...ugandaPatterns];

  for (const pattern of allPatterns) {
    const match = content.match(pattern.regex);
    if (match) {
      const amount = extractAmountFromMatch(match, pattern.pattern);
      
      console.log('USSD pattern matched:', {
        pattern: pattern.pattern,
        country: pattern.country,
        provider: pattern.provider,
        amount
      });

      return {
        isValid: true,
        sanitized: content,
        confidence: pattern.confidence,
        country: pattern.country,
        provider: pattern.provider,
        pattern: pattern.pattern,
        amount
      };
    }
  }

  return {
    isValid: false,
    sanitized: content,
    confidence: 0
  };
}

function extractAmountFromMatch(match: RegExpMatchArray, pattern: string): number | undefined {
  // Different patterns have amount in different positions
  switch (pattern) {
    case 'phone_number':
    case 'agent_code':
      // Amount is in the last capture group
      return match[2] ? parseInt(match[2]) : undefined;
    case 'equity_bank':
    case 'airtel_money':
      // Amount is in the second capture group
      return match[2] ? parseInt(match[2]) : undefined;
    case 'generic':
      // Try to find amount in the string
      const amountMatch = match[0].match(/\*(\d+)#$/);
      return amountMatch ? parseInt(amountMatch[1]) : undefined;
    default:
      return undefined;
  }
}

function attemptQRFix(content: string): QRValidationResult {
  console.log('Attempting to fix QR content:', content);
  
  // Common fixes
  const fixes = [
    // Add missing # at the end
    (str: string) => str.endsWith('#') ? str : str + '#',
    // Fix common character substitutions
    (str: string) => str.replace(/[oO]/g, '0').replace(/[lI]/g, '1'),
    // Remove any non-USSD characters except * and #
    (str: string) => str.replace(/[^*#0-9]/g, ''),
    // Add missing * at the beginning
    (str: string) => str.startsWith('*') ? str : '*' + str
  ];

  for (const fix of fixes) {
    const fixed = fix(content);
    if (fixed !== content) {
      console.log('Trying fix:', fixed);
      const validation = validateUSSDPattern(fixed);
      if (validation.isValid) {
        console.log('Fix successful:', fixed);
        return {
          ...validation,
          confidence: validation.confidence * 0.8 // Reduce confidence for fixed content
        };
      }
    }
  }

  return {
    isValid: false,
    sanitized: content,
    confidence: 0
  };
}