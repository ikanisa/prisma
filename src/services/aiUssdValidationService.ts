
import { validateUniversalUssd, UssdValidationResult } from '@/utils/universalUssdHelper';
import { networkDetectionService, NetworkInfo } from './networkDetectionService';

export interface AIValidationResult extends UssdValidationResult {
  aiSuggestion?: string;
  alternativeFormats?: string[];
  networkContext?: NetworkInfo;
  confidence?: number; // Add confidence property to the interface
}

export const aiUssdValidationService = {
  // Enhanced validation with AI-powered suggestions
  async validateWithAI(rawUssd: string): Promise<AIValidationResult> {
    // Start with standard validation
    const standardValidation = validateUniversalUssd(rawUssd);
    
    // Get network context
    const networkInfo = await networkDetectionService.detectNetworkProvider();
    
    // If standard validation passes, enhance with network context
    if (standardValidation.isValid) {
      const networkValidation = networkDetectionService.enhanceUssdValidation(
        standardValidation.sanitized, 
        networkInfo
      );
      
      return {
        ...standardValidation,
        networkContext: networkInfo,
        confidence: networkValidation.confidence
      };
    }

    // For invalid codes, try AI-powered suggestions
    const suggestions = this.generateAISuggestions(rawUssd, networkInfo);
    
    return {
      ...standardValidation,
      aiSuggestion: suggestions.primary,
      alternativeFormats: suggestions.alternatives,
      networkContext: networkInfo
    };
  },

  // Generate AI-powered suggestions for invalid USSD codes
  generateAISuggestions(ussd: string, networkInfo: NetworkInfo): {
    primary?: string;
    alternatives: string[];
  } {
    const suggestions: string[] = [];
    
    // Extract potential phone numbers or codes
    const numbers = ussd.match(/\d+/g) || [];
    
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

    return {
      primary: suggestions[0],
      alternatives: suggestions.slice(1, 4) // Limit to 3 alternatives
    };
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
      sanitized: correctedCode,
      type: 'manual_override',
      confidence: 0.9 // High confidence for manual input
    };
  }
};
