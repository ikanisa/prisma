
import { validateUSSDFormat, extractPaymentDetails } from './ussdHelper';
import { errorMonitoringService } from '@/services/errorMonitoringService';

export interface QRValidationResult {
  isValid: boolean;
  type: 'ussd' | 'url' | 'text' | 'payment' | 'unknown';
  confidence: number;
  extractedData?: {
    phone?: string;
    amount?: string;
    code?: string;
    ussdCode?: string;
  };
  errors?: string[];
}

export const validateQRContent = (content: string): QRValidationResult => {
  try {
    const trimmedContent = content.trim();
    const errors: string[] = [];

    // Check for USSD format first
    if (validateUSSDFormat(trimmedContent)) {
      const details = extractPaymentDetails(trimmedContent);
      
      return {
        isValid: true,
        type: 'ussd',
        confidence: 0.95,
        extractedData: {
          ...details,
          ussdCode: trimmedContent
        }
      };
    }

    // Check for potential USSD patterns with common variations
    const ussdPatterns = [
      /\*182\*\d+\*\d+\*\d+\*\d+#/,  // Standard pattern
      /\*182\*\d+\*\d+#/,             // Simplified pattern
      /\*\d{3}\*.*#/                  // General USSD pattern
    ];

    for (const pattern of ussdPatterns) {
      if (pattern.test(trimmedContent)) {
        return {
          isValid: true,
          type: 'payment',
          confidence: 0.8,
          extractedData: {
            ussdCode: trimmedContent
          }
        };
      }
    }

    // Check for URL patterns
    if (trimmedContent.startsWith('http') || trimmedContent.includes('://')) {
      return {
        isValid: true,
        type: 'url',
        confidence: 0.7,
        extractedData: {
          ussdCode: trimmedContent
        }
      };
    }

    // Check for numeric patterns that might be codes
    if (/^\d{4,8}$/.test(trimmedContent)) {
      return {
        isValid: true,
        type: 'payment',
        confidence: 0.6,
        extractedData: {
          code: trimmedContent
        }
      };
    }

    // If content has some structure, mark as potentially valid
    if (trimmedContent.length > 5 && /[*#\d]/.test(trimmedContent)) {
      return {
        isValid: true,
        type: 'text',
        confidence: 0.4,
        extractedData: {
          ussdCode: trimmedContent
        },
        errors: ['Content format not recognized but may be valid']
      };
    }

    return {
      isValid: false,
      type: 'unknown',
      confidence: 0,
      errors: ['Content does not match any known payment format']
    };

  } catch (error) {
    errorMonitoringService.logError(error as Error, 'qr_validation');
    
    return {
      isValid: false,
      type: 'unknown',
      confidence: 0,
      errors: ['Error validating QR content']
    };
  }
};

export const suggestQRFixes = (content: string): string[] => {
  const suggestions: string[] = [];
  
  if (content.includes('*') && !content.includes('#')) {
    suggestions.push('Add # at the end of the USSD code');
  }
  
  if (content.includes('#') && !content.includes('*')) {
    suggestions.push('USSD codes should start with *');
  }
  
  if (/\d{9,10}/.test(content) && !content.includes('*182*')) {
    suggestions.push('Try formatting as: *182*1*1*{phone}*{amount}#');
  }
  
  if (content.length < 5) {
    suggestions.push('QR content seems too short for a payment code');
  }
  
  return suggestions;
};
