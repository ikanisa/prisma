export interface QRValidationResult {
  isValid: boolean;
  type: 'ussd' | 'url' | 'text' | 'payment' | 'unknown';
  confidence: number;
  extractedData?: any;
  errors?: string[];
}

export const validateQRContent = (content: string): QRValidationResult => {
  const trimmedContent = content.trim();
  
  // USSD validation
  if (/\*182\*\d+\*\d+\*\d+\*\d+#/.test(trimmedContent)) {
    return {
      isValid: true,
      type: 'ussd',
      confidence: 0.95,
      extractedData: { ussdCode: trimmedContent }
    };
  }

  // URL validation
  if (trimmedContent.startsWith('http')) {
    return {
      isValid: true,
      type: 'url',
      confidence: 0.8,
      extractedData: { url: trimmedContent }
    };
  }

  return {
    isValid: false,
    type: 'unknown',
    confidence: 0,
    errors: ['Unknown QR format']
  };
};