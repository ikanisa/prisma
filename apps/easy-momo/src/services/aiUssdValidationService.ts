
import { validateUniversalUssd, UssdValidationResult, normaliseUssd } from '@/utils/universalUssdHelper';
import { networkDetectionService, NetworkInfo } from './networkDetectionService';

export interface AIValidationResult extends UssdValidationResult {
  aiSuggestion?: string;
  alternativeFormats?: string[];
  networkContext?: NetworkInfo;
  confidence?: number;
}

export const aiUssdValidationService = {
  // Enhanced validation with AI-powered suggestions
  async validateWithAI(rawUssd: string): Promise<AIValidationResult> {
    console.log('aiUssdValidationService.validateWithAI input:', rawUssd);
    
    // First normalize the input to handle tel: prefixes and URI encoding
    const normalizedUssd = normaliseUssd(rawUssd);
    console.log('aiUssdValidationService normalized:', normalizedUssd);
    
    // Start with standard validation using normalized input
    const standardValidation = validateUniversalUssd(normalizedUssd);
    console.log('aiUssdValidationService standard validation:', standardValidation);
    
    // Get network context
    const networkInfo = await networkDetectionService.detectNetworkProvider();
    
    // If standard validation passes, enhance with network context
    if (standardValidation.isValid) {
      const networkValidation = networkDetectionService.enhanceUssdValidation(
        standardValidation.sanitized, 
        networkInfo
      );
      
      const result = {
        ...standardValidation,
        networkContext: networkInfo,
        confidence: networkValidation.confidence
      };
      console.log('aiUssdValidationService final result:', result);
      return result;
    }

    // For invalid codes, try AI-powered suggestions
    const suggestions = this.generateAISuggestions(normalizedUssd, networkInfo);
    
    const result = {
      ...standardValidation,
      aiSuggestion: suggestions.primary,
      alternativeFormats: suggestions.alternatives,
      networkContext: networkInfo
    };
    console.log('aiUssdValidationService final result with suggestions:', result);
    return result;
  },

  // Generate AI-powered suggestions for invalid USSD codes
  generateAISuggestions(ussd: string, networkInfo: NetworkInfo): {
    primary?: string;
    alternatives: string[];
  } {
    console.log('generateAISuggestions input:', ussd);
    const suggestions: string[] = [];
    
    // Extract potential phone numbers or codes
    const numbers = ussd.match(/\d+/g) || [];
    console.log('Extracted numbers:', numbers);
    
    if (numbers.length >= 2) {
      const [first, second] = numbers;
      
      // If we have network context, prioritize those patterns
      if (networkInfo.country) {
        switch (networkInfo.country) {
          case 'Rwanda':
            if (first.length === 10) {
              suggestions.push(`*182*1*1*${first}*${second}#`);
            }
            if (first.length <= 6) {
              suggestions.push(`*182*8*1*${first}*${second}#`);
            }
            break;
          case 'Kenya':
            suggestions.push(`*234*${first}*${second}#`);
            break;
          case 'Uganda':
            suggestions.push(`*165*${first}*${second}#`);
            break;
        }
      }
      
      // Generic patterns as fallback
      suggestions.push(`*182*1*1*${first}*${second}#`);
      suggestions.push(`*144*${first}*${second}#`);
      suggestions.push(`*126*${first}*${second}#`);
    }

    const result = {
      primary: suggestions[0],
      alternatives: suggestions.slice(1, 4) // Limit to 3 alternatives
    };
    console.log('generateAISuggestions result:', result);
    return result;
  },

  // Manual override functionality
  createManualOverride(originalCode: string, correctedCode: string, reason: string): {
    isValid: boolean;
    sanitized: string;
    type: string;
    confidence: number;
  } {
    console.log('Manual USSD override:', {
      original: originalCode,
      corrected: correctedCode,
      reason
    });

    return {
      isValid: true,
      sanitized: normaliseUssd(correctedCode),
      type: 'manual_override',
      confidence: 0.9 // High confidence for manual input
    };
  }
};
