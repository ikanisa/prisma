/**
 * REFACTOR: Centralized OpenAI client with error handling
 * Eliminates duplicate OpenAI setup across multiple edge functions
 */

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAICompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class OpenAIClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1';

  constructor() {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  async chatCompletion(
    messages: OpenAIMessage[],
    options: OpenAICompletionOptions = {}
  ): Promise<OpenAIResponse> {
    const {
      model = 'gpt-4o',
      temperature = 0.7,
      max_tokens = 1000,
      stream = false
    } = options;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        stream
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  async generateEmbedding(text: string, model: string = 'text-embedding-3-small'): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI Embedding API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  // Agent-specific helpers
  async generateResponse(
    userMessage: string,
    systemPrompt: string,
    conversationHistory: OpenAIMessage[] = [],
    options: OpenAICompletionOptions = {}
  ): Promise<string> {
    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    const response = await this.chatCompletion(messages, options);
    
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response generated from OpenAI');
    }

    return response.choices[0].message.content;
  }

  async analyzeIntent(message: string): Promise<{
    intent: string;
    confidence: number;
    entities: Record<string, string>;
  }> {
    const systemPrompt = `You are an intent classifier for easyMO platform. Analyze the user message and return a JSON response with:
    - intent: one of [payment, ride_request, product_browse, driver_signup, event_inquiry, support, general]
    - confidence: 0.0 to 1.0
    - entities: extracted entities (amounts, locations, etc.)

    Examples:
    "I need 5000" -> {"intent": "payment", "confidence": 0.9, "entities": {"amount": "5000"}}
    "Taxi from Kigali to Huye" -> {"intent": "ride_request", "confidence": 0.95, "entities": {"from": "Kigali", "to": "Huye"}}`;

    const response = await this.generateResponse(message, systemPrompt, [], {
      temperature: 0.1,
      max_tokens: 200
    });

    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse intent analysis:', response);
      return {
        intent: 'general',
        confidence: 0.5,
        entities: {}
      };
    }
  }
}

// Singleton instance
let openaiClient: OpenAIClient | null = null;

export function getOpenAIClient(): OpenAIClient {
  if (!openaiClient) {
    openaiClient = new OpenAIClient();
  }
  return openaiClient;
}

// Convenience exports
export type { OpenAIMessage, OpenAICompletionOptions, OpenAIResponse };
export { OpenAIClient };