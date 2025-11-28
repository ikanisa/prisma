/**
 * Gemini API Client
 * Handles communication with FastAPI Gemini backend
 */

import { env } from '@/lib/env';

export interface GeminiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface GeminiStreamChunk {
  content: string;
  done: boolean;
}

export interface GeminiChatRequest {
  messages: GeminiMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface GeminiChatResponse {
  content: string;
  model: string;
  tokensUsed: number;
  finishReason: string;
}

class GeminiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = env.VITE_API_URL || 'http://localhost:8000';
    this.apiKey = env.VITE_GEMINI_API_KEY || '';
  }

  async chat(request: GeminiChatRequest): Promise<GeminiChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/gemini/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to send chat request');
    }

    return response.json();
  }

  async *chatStream(request: GeminiChatRequest): AsyncGenerator<GeminiStreamChunk> {
    const response = await fetch(`${this.baseUrl}/api/gemini/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to stream chat');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              yield { content: parsed.content, done: false };
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async createAgent(config: {
    name: string;
    instructions: string;
    tools?: any[];
    model?: string;
  }): Promise<{ agentId: string }> {
    const response = await fetch(`${this.baseUrl}/api/gemini/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create agent');
    }

    return response.json();
  }
}

export const geminiClient = new GeminiClient();
