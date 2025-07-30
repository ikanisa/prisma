import { logger } from './logger.ts';

export class OpenAIService {
  private apiKey: string;

  constructor() {
    this.apiKey = Deno.env.get('OPENAI_API_KEY') || '';
    if (!this.apiKey) {
      logger.error('OpenAI API key not found in environment variables');
    }
  }

  /**
   * Generate intelligent response using latest OpenAI model
   */
  async generateIntelligentResponse(
    prompt: string, 
    systemMessage: string, 
    context: string[] = [],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<string> {
    try {
      const messages = [
        { role: 'system', content: systemMessage }
      ];

      // Add context if available
      if (context.length > 0) {
        messages.push({
          role: 'system',
          content: `Context from previous conversations:\n${context.join('\n')}`
        });
      }

      messages.push({ role: 'user', content: prompt });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: options.model || 'gpt-4.1-2025-04-14',
          messages: messages,
          max_tokens: options.maxTokens || 300,
          temperature: options.temperature || 0.7,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        })
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('OpenAI API error', new Error(error), { status: response.status });
        throw new Error(`OpenAI API failed: ${response.status}`);
      }

      const data = await response.json();
      const result = data.choices[0]?.message?.content?.trim() || '';
      
      logger.info('OpenAI response generated', { 
        promptLength: prompt.length,
        responseLength: result.length,
        model: options.model || 'gpt-4.1-2025-04-14'
      });

      return result;
    } catch (error) {
      logger.error('Error generating OpenAI response', error);
      throw error;
    }
  }

  /**
   * Analyze user intent with structured output
   */
  async analyzeIntent(message: string, userContext?: any): Promise<{
    intent: string;
    domain: string;
    confidence: number;
    entities: Record<string, any>;
    requiresLocation: boolean;
    nextAction: string;
  }> {
    try {
      const systemPrompt = `You are an intelligent intent classifier for easyMO, Rwanda's WhatsApp super-app.

AVAILABLE DOMAINS & INTENTS:
🏦 PAYMENTS: generate_qr, send_money, check_balance, payment_history
🏍️ TRANSPORT: book_ride, go_online_driver, find_drivers
🏪 BUSINESS: search_pharmacy, search_restaurant, search_hardware, search_bar
🛒 COMMERCE: browse_products, place_order, check_order
🏠 LISTINGS: search_property, search_vehicle, create_listing
❓ SUPPORT: help_request, technical_issue, human_handoff

RWANDA CONTEXT:
- Currency: RWF (Rwandan Francs)
- Mobile money: MTN MoMo, Airtel Money
- Transport: Motos (motorcycle taxis)
- Language: Mix of Kinyarwanda, English, French

RESPONSE FORMAT (JSON only):
{
  "intent": "specific_intent_name",
  "domain": "domain_name", 
  "confidence": 0.0-1.0,
  "entities": {
    "amount": number_if_payment,
    "business_type": "pharmacy|restaurant|hardware|bar",
    "location": "if_mentioned"
  },
  "requiresLocation": boolean,
  "nextAction": "generate_qr|request_location|search_business|ask_clarification"
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analyze this message: "${message}"` }
          ],
          temperature: 0.1,
          max_tokens: 200
        })
      });

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);
      
      return {
        intent: result.intent || 'help_request',
        domain: result.domain || 'support',
        confidence: result.confidence || 0.5,
        entities: result.entities || {},
        requiresLocation: result.requiresLocation || false,
        nextAction: result.nextAction || 'ask_clarification'
      };
      
    } catch (error) {
      logger.error('Intent analysis failed', error);
      return {
        intent: 'help_request',
        domain: 'support',
        confidence: 0.3,
        entities: {},
        requiresLocation: false,
        nextAction: 'ask_clarification'
      };
    }
  }

  /**
   * Generate context-aware response based on intent and user data
   */
  async generateContextualResponse(
    intent: any,
    message: string,
    userContext: any = {}
  ): Promise<string> {
    try {
      const systemPrompt = `You are easyMO's AI assistant for Rwanda.

USER CONTEXT:
- Phone: ${userContext.phone || 'unknown'}
- Name: ${userContext.name || 'User'}
- Previous interactions: ${userContext.conversationCount || 0}
- User type: ${userContext.userType || 'new'}

CURRENT INTENT: ${intent.intent} (${intent.domain})
CONFIDENCE: ${intent.confidence}

RESPONSE GUIDELINES:
- Keep responses SHORT (1-2 sentences)
- Be specific and actionable
- Use Rwandan context (RWF, MoMo, motos)
- Always provide clear next steps
- If location needed, ask for it specifically
- For payments, mention USSD codes and QR generation

CAPABILITIES:
💰 Generate payment QR codes with user's phone as MoMo number
🏪 Search 1800+ businesses by location
🏍️ Book moto rides and find drivers
🛒 Order from local businesses
🏠 Property and vehicle listings`;

      const response = await this.generateIntelligentResponse(
        `User message: "${message}"\nIntent: ${intent.intent}\nNext action: ${intent.nextAction}`,
        systemPrompt,
        [],
        { temperature: 0.7, maxTokens: 150 }
      );

      return response;
      
    } catch (error) {
      logger.error('Contextual response generation failed', error);
      return '👋 Hi! I\'m easyMO\'s AI assistant. I can help you with payments, finding businesses, booking rides, and more. What do you need?';
    }
  }

  /**
   * Analyze sentiment of user message
   */
  async analyzeSentiment(text: string): Promise<'positive' | 'negative' | 'neutral'> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'system',
              content: 'Analyze the sentiment of the following text. Respond with only one word: positive, negative, or neutral.'
            },
            { role: 'user', content: text }
          ],
          max_tokens: 5,
          temperature: 0
        })
      });

      const data = await response.json();
      const sentiment = data.choices[0]?.message?.content?.trim().toLowerCase() || 'neutral';
      
      if (['positive', 'negative', 'neutral'].includes(sentiment)) {
        return sentiment as 'positive' | 'negative' | 'neutral';
      }
      
      return 'neutral';
    } catch (error) {
      logger.error('Error analyzing sentiment', error);
      return 'neutral';
    }
  }
}