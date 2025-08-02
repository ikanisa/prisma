
// Enhanced USSD validation and encoding utilities
export const RWANDA_MTN_PATTERNS = {
  PHONE_PAYMENT: /^\*182\*1\*1\*\d{9,12}\*\d{3,}#$/,
  CODE_PAYMENT: /^\*182\*8\*1\*\d{4,6}\*\d{3,}#$/,
  GENERIC_MTN: /^\*182\*.*#$/
};

export const UNIVERSAL_USSD_PATTERNS = {
  UGANDA_MTN: /^\*165\*\d+\*\d+#$/,
  KENYA_MPESA: /^\*234\*\d+\*\d+#$/,
  AIRTEL_MONEY: /^\*144\*\d+\*\d+#$/,
  ORANGE_MONEY: /^\*126\*\d+\*\d+#$/,
  GENERIC_USSD: /^\*\d{2,4}\*.*#$/
};

export interface USSDValidationResult {
  isValid: boolean;
  pattern: string;
  country: string;
  provider: string;
  sanitized: string;
  confidence: number;
}

export const stripTelPrefix = (input: string): string => {
  const cleaned = input.toLowerCase().startsWith('tel:') ? input.slice(4) : input;
  return decodeURIComponent(cleaned);
};

export const normaliseUssd = (input: string): string => {
  let ussd = stripTelPrefix(input).trim().replace(/\s+/g, '');
  
  // Ensure it starts with * and ends with #
  if (!ussd.startsWith('*')) {
    ussd = '*' + ussd;
  }
  if (!ussd.endsWith('#')) {
    ussd += '#';
  }
  
  return ussd;
};

export const encodeUssdForTel = (ussd: string): string => {
  const normalized = normaliseUssd(ussd);
  return `tel:${encodeURIComponent(normalized)}`;
};

export const validateUSSDString = (rawUssd: string): USSDValidationResult => {
  const sanitized = normaliseUssd(rawUssd);
  
  // Check Rwanda MTN patterns first
  if (RWANDA_MTN_PATTERNS.PHONE_PAYMENT.test(sanitized)) {
    return {
      isValid: true,
      pattern: 'phone_payment',
      country: 'Rwanda',
      provider: 'MTN',
      sanitized,
      confidence: 0.95
    };
  }
  
  if (RWANDA_MTN_PATTERNS.CODE_PAYMENT.test(sanitized)) {
    return {
      isValid: true,
      pattern: 'code_payment',
      country: 'Rwanda',
      provider: 'MTN',
      sanitized,
      confidence: 0.95
    };
  }
  
  // Check other African providers
  if (UNIVERSAL_USSD_PATTERNS.UGANDA_MTN.test(sanitized)) {
    return {
      isValid: true,
      pattern: 'mtn_uganda',
      country: 'Uganda',
      provider: 'MTN',
      sanitized,
      confidence: 0.9
    };
  }
  
  if (UNIVERSAL_USSD_PATTERNS.KENYA_MPESA.test(sanitized)) {
    return {
      isValid: true,
      pattern: 'mpesa',
      country: 'Kenya',
      provider: 'Safaricom',
      sanitized,
      confidence: 0.9
    };
  }
  
  // Generic USSD validation
  if (UNIVERSAL_USSD_PATTERNS.GENERIC_USSD.test(sanitized)) {
    return {
      isValid: true,
      pattern: 'generic',
      country: 'Unknown',
      provider: 'Unknown',
      sanitized,
      confidence: 0.7
    };
  }
  
  return {
    isValid: false,
    pattern: 'unknown',
    country: 'Unknown',
    provider: 'Unknown',
    sanitized,
    confidence: 0.1
  };
};

export const generateUSSDFromInputs = (receiver: string, amount: string): string => {
  const cleanReceiver = receiver.replace(/\D/g, '');
  const cleanAmount = amount.replace(/[^\d.]/g, '');
  
  // Determine if it's a phone number or code
  if (cleanReceiver.length >= 9) {
    // Phone number format
    return `*182*1*1*${cleanReceiver}*${Math.floor(parseFloat(cleanAmount))}#`;
  } else if (cleanReceiver.length >= 4 && cleanReceiver.length <= 6) {
    // Agent code format
    return `*182*8*1*${cleanReceiver}*${Math.floor(parseFloat(cleanAmount))}#`;
  }
  
  // Default to phone format
  return `*182*1*1*${cleanReceiver}*${Math.floor(parseFloat(cleanAmount))}#`;
};
