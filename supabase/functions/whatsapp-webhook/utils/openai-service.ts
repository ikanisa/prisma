export class OpenAIService {
  private apiKey: string;

  constructor() {
    this.apiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
  }

  async generateResponse(
    prompt: string, 
    systemMessage: string, 
    context: string[] = [],
    maxTokens: number = 200
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
          model: 'gpt-4o',
          messages: messages,
          max_tokens: maxTokens,
          temperature: 0.8,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ OpenAI API error:', error);
        throw new Error(`OpenAI API failed: ${response.status}`);
      }

      const data = await response.json();
      const result = data.choices[0]?.message?.content?.trim() || '';
      
      // Ensure response is within WhatsApp limits (≤200 chars unless listing)
      if (result.length > 200 && !result.includes('\n•') && !result.includes('\n-')) {
        return result.substring(0, 197) + '...';
      }

      return result;
    } catch (error) {
      console.error('❌ Error generating OpenAI response:', error);
      throw error;
    }
  }

  async analyzeSentiment(text: string): Promise<'positive' | 'negative' | 'neutral'> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
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
      console.error('❌ Error analyzing sentiment:', error);
      return 'neutral';
    }
  }

  async extractIntent(message: string): Promise<{
    intent: string;
    confidence: number;
    entities: Record<string, string>;
  }> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Analyze the intent of this WhatsApp message for an easyMO (payments/marketplace/transportation) service. 
              Respond with JSON: {"intent": "intent_name", "confidence": 0.0-1.0, "entities": {"key": "value"}}
              
              Possible intents: payment_request, browse_products, buy_product, list_product, driver_online, driver_offline, event_search, help_request, onboarding, general_inquiry`
            },
            { role: 'user', content: message }
          ],
          max_tokens: 100,
          temperature: 0
        })
      });

      const data = await response.json();
      const result = data.choices[0]?.message?.content?.trim() || '{}';
      
      try {
        return JSON.parse(result);
      } catch {
        return {
          intent: 'general_inquiry',
          confidence: 0.5,
          entities: {}
        };
      }
    } catch (error) {
      console.error('❌ Error extracting intent:', error);
      return {
        intent: 'general_inquiry',
        confidence: 0.5,
        entities: {}
      };
    }
  }
}