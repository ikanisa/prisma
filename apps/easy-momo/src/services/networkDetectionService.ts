
export interface NetworkInfo {
  country?: string;
  provider?: string;
  mcc?: string; // Mobile Country Code
  mnc?: string; // Mobile Network Code
  confidence: number;
}

export interface ConnectionInfo {
  type: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export const networkDetectionService = {
  // Detect network provider from browser APIs (limited but available)
  async detectNetworkProvider(): Promise<NetworkInfo> {
    try {
      // Check if we have network information API
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      if (connection) {
        // Basic connection info available
        const connectionInfo: ConnectionInfo = {
          type: connection.type || 'unknown',
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt
        };
        
        console.log('Network connection info:', connectionInfo);
        
        // Try to infer from timezone and language
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const language = navigator.language;
        
        return this.inferProviderFromContext(timezone, language);
      }
      
      // Fallback to timezone/language detection
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const language = navigator.language;
      
      return this.inferProviderFromContext(timezone, language);
      
    } catch (error) {
      console.warn('Network detection failed:', error);
      return {
        confidence: 0.1
      };
    }
  },

  // Infer likely country/provider from browser context
  inferProviderFromContext(timezone: string, language: string): NetworkInfo {
    const countryMappings: Record<string, { country: string; providers: string[]; confidence: number }> = {
      'Africa/Kigali': {
        country: 'Rwanda',
        providers: ['MTN', 'Airtel'],
        confidence: 0.8
      },
      'Africa/Kampala': {
        country: 'Uganda',
        providers: ['MTN', 'Airtel'],
        confidence: 0.8
      },
      'Africa/Nairobi': {
        country: 'Kenya',
        providers: ['Safaricom', 'Airtel'],
        confidence: 0.8
      },
      'Africa/Johannesburg': {
        country: 'South Africa',
        providers: ['MTN', 'Vodacom'],
        confidence: 0.8
      },
      'Africa/Accra': {
        country: 'Ghana',
        providers: ['MTN', 'Vodafone'],
        confidence: 0.8
      },
      'Africa/Lagos': {
        country: 'Nigeria',
        providers: ['MTN', 'Airtel', 'Glo'],
        confidence: 0.8
      }
    };

    const mapping = countryMappings[timezone];
    if (mapping) {
      return {
        country: mapping.country,
        provider: mapping.providers[0], // Default to first provider
        confidence: mapping.confidence
      };
    }

    // Language-based fallback
    if (language.startsWith('rw')) {
      return { country: 'Rwanda', provider: 'MTN', confidence: 0.6 };
    }
    if (language.startsWith('sw')) {
      return { country: 'Kenya', provider: 'Safaricom', confidence: 0.6 };
    }

    return { confidence: 0.2 };
  },

  // Enhanced USSD validation with network context
  enhanceUssdValidation(ussdCode: string, networkInfo: NetworkInfo): {
    isValid: boolean;
    confidence: number;
    suggestedProvider?: string;
  } {
    // If we detected a network and the USSD doesn't match, suggest alternatives
    if (networkInfo.country && networkInfo.provider) {
      const providerPatterns: Record<string, RegExp[]> = {
        'MTN': [/^\*182\*/, /^\*165\*/, /^\*170\*/],
        'Safaricom': [/^\*234\*/],
        'Airtel': [/^\*144\*/],
        'Orange': [/^\*126\*/]
      };

      const patterns = providerPatterns[networkInfo.provider];
      if (patterns) {
        const matches = patterns.some(pattern => pattern.test(ussdCode));
        if (matches) {
          return {
            isValid: true,
            confidence: Math.min(0.95, networkInfo.confidence + 0.15),
            suggestedProvider: networkInfo.provider
          };
        } else {
          // Suggest the detected provider's pattern
          return {
            isValid: false,
            confidence: 0.3,
            suggestedProvider: networkInfo.provider
          };
        }
      }
    }

    return {
      isValid: ussdCode.length > 5 && ussdCode.includes('*'),
      confidence: 0.5
    };
  }
};
