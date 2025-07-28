// OpenAI integration will be handled in edge functions

export interface IntentResult {
  domain: string;
  intent: string;
  confidence: number;
  slots: Record<string, any>;
  fallback?: boolean;
}

export interface IntentRule {
  pattern: RegExp;
  domain: string;
  intent: string;
  slots?: (match: RegExpMatchArray) => Record<string, any>;
}

// Rule-based intent patterns
const INTENT_RULES: IntentRule[] = [
  // Payments
  {
    pattern: /(?:get paid|receive money|qr.*pay|payment.*qr)/i,
    domain: 'payments',
    intent: 'get_paid'
  },
  {
    pattern: /(?:pay someone|send money|transfer|pay.*\d)/i,
    domain: 'payments',
    intent: 'pay_someone'
  },
  {
    pattern: /(?:payment.*history|transaction.*history|my.*payments)/i,
    domain: 'payments',
    intent: 'history'
  },
  
  // Moto/Transport
  {
    pattern: /(?:driver.*on|start.*driving|accept.*passengers)/i,
    domain: 'moto',
    intent: 'driver_create_trip'
  },
  {
    pattern: /(?:need.*ride|book.*trip|find.*driver|transport)/i,
    domain: 'moto',
    intent: 'passenger_create_intent'
  },
  {
    pattern: /(?:nearby.*drivers|drivers.*near|available.*drivers)/i,
    domain: 'moto',
    intent: 'view_nearby_drivers'
  },
  
  // Listings
  {
    pattern: /(?:rent.*house|property.*rent|apartment|house.*sale)/i,
    domain: 'listings',
    intent: 'property_search'
  },
  {
    pattern: /(?:sell.*car|vehicle.*sale|motorbike.*sale|bike.*sell)/i,
    domain: 'listings',
    intent: 'vehicle_search'
  },
  {
    pattern: /(?:list.*property|add.*house|rent.*out)/i,
    domain: 'listings',
    intent: 'property_list'
  },
  
  // Commerce
  {
    pattern: /(?:pharmacy|medicine|drugs|prescription)/i,
    domain: 'commerce',
    intent: 'order_pharmacy'
  },
  {
    pattern: /(?:hardware|tools|construction|building)/i,
    domain: 'commerce',
    intent: 'order_hardware'
  },
  {
    pattern: /(?:bar|drink|beer|alcohol|restaurant)/i,
    domain: 'commerce',
    intent: 'order_bar'
  },
  
  // Admin Support
  {
    pattern: /(?:help|support|problem|issue|talk.*human)/i,
    domain: 'admin_support',
    intent: 'help'
  }
];

export class IntentRouter {
  /**
   * Route incoming message to appropriate domain and intent
   */
  async route(message: string, userId: string, context?: any): Promise<IntentResult> {
    const normalizedMessage = this.normalizeMessage(message);
    
    // Try rule-based matching first
    const ruleResult = this.matchRules(normalizedMessage);
    if (ruleResult) {
      return ruleResult;
    }
    
    // Fallback to LLM-based intent detection
    return this.llmFallback(normalizedMessage, userId, context);
  }
  
  private normalizeMessage(message: string): string {
    return message.toLowerCase().trim();
  }
  
  private matchRules(message: string): IntentResult | null {
    for (const rule of INTENT_RULES) {
      const match = message.match(rule.pattern);
      if (match) {
        return {
          domain: rule.domain,
          intent: rule.intent,
          confidence: 0.9,
          slots: rule.slots ? rule.slots(match) : {},
          fallback: false
        };
      }
    }
    return null;
  }
  
  private async llmFallback(message: string, userId: string, context?: any): Promise<IntentResult> {
    try {
      // Call edge function for LLM intent detection
      const response = await fetch('/functions/v1/omni-agent-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'detect_intent',
          message,
          userId,
          context
        })
      });
      
      if (!response.ok) {
        throw new Error('Intent detection failed');
      }
      
      const result = await response.json();
      
      return {
        domain: result.domain || 'admin_support',
        intent: result.intent || 'help', 
        confidence: result.confidence || 0.5,
        slots: result.slots || {},
        fallback: true
      };
      
    } catch (error) {
      console.error('LLM intent fallback failed:', error);
      
      // Ultimate fallback
      return {
        domain: 'admin_support',
        intent: 'help',
        confidence: 0.1,
        slots: {},
        fallback: true
      };
    }
  }
  
  /**
   * Add or update intent rules dynamically
   */
  addRule(rule: IntentRule): void {
    INTENT_RULES.push(rule);
  }
  
  /**
   * Get available domains and intents
   */
  getAvailableIntents(): Record<string, string[]> {
    const domains: Record<string, Set<string>> = {};
    
    INTENT_RULES.forEach(rule => {
      if (!domains[rule.domain]) {
        domains[rule.domain] = new Set();
      }
      domains[rule.domain].add(rule.intent);
    });
    
    // Convert Sets to arrays
    const result: Record<string, string[]> = {};
    Object.keys(domains).forEach(domain => {
      result[domain] = Array.from(domains[domain]);
    });
    
    return result;
  }
}

export const intentRouter = new IntentRouter();