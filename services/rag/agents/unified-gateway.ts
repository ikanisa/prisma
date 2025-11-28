/**
 * Unified Agent Gateway
 *
 * Provides a TypeScript interface to the Python multi-provider agent system.
 * Handles request routing, streaming, and error handling.
 */

import type {
  AgentProvider,
  AgentRequest,
  AgentResponse,
  AgentConfig,
  StreamEvent,
  AgentOrchestrationOptions,
} from './types.js';

export class UnifiedAgentGateway {
  private pythonServiceUrl: string;
  private defaultProvider: AgentProvider;
  private fallbackProviders: AgentProvider[];

  constructor(options: AgentOrchestrationOptions) {
    this.pythonServiceUrl = process.env.PYTHON_AGENT_SERVICE_URL || 'http://localhost:8000';
    this.defaultProvider = options.defaultProvider;
    this.fallbackProviders = options.fallbackProviders || [];
  }

  /**
   * Execute an agent with automatic provider fallback
   */
  async execute(request: AgentRequest): Promise<AgentResponse> {
    const provider = request.provider || this.defaultProvider;

    try {
      return await this.executeWithProvider(request, provider);
    } catch (error) {
      // Try fallback providers
      for (const fallbackProvider of this.fallbackProviders) {
        try {
          return await this.executeWithProvider(request, fallbackProvider);
        } catch (fallbackError) {
          // Continue to next fallback
          continue;
        }
      }

      // All providers failed
      throw error;
    }
  }

  /**
   * Execute with a specific provider
   */
  private async executeWithProvider(
    request: AgentRequest,
    provider: AgentProvider
  ): Promise<AgentResponse> {
    const response = await fetch(`${this.pythonServiceUrl}/agents/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: request.agentId,
        input_text: request.input,
        context: request.context,
        provider: provider,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Agent execution failed: ${error}`);
    }

    const data = await response.json();

    return {
      content: data.content,
      toolCalls: data.tool_calls || [],
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      provider: data.provider,
      metadata: data.metadata || {},
    };
  }

  /**
   * Stream agent responses
   */
  async *stream(request: AgentRequest): AsyncGenerator<StreamEvent> {
    const provider = request.provider || this.defaultProvider;

    const response = await fetch(`${this.pythonServiceUrl}/agents/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: request.agentId,
        input_text: request.input,
        context: request.context,
        provider: provider,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Agent streaming failed: ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;

          try {
            const data = JSON.parse(line);

            yield {
              type: data.metadata?.event_type || 'content_delta',
              data: {
                content: data.content,
                toolCalls: data.tool_calls || [],
                usage: {
                  inputTokens: data.usage?.input_tokens || 0,
                  outputTokens: data.usage?.output_tokens || 0,
                  totalTokens: data.usage?.total_tokens || 0,
                },
                provider: data.provider,
                metadata: data.metadata || {},
              },
            };
          } catch (parseError) {
            console.error('Failed to parse stream event:', parseError);
          }
        }
      }

      // Emit done event
      yield {
        type: 'done',
        data: {
          content: '',
          toolCalls: [],
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          provider,
          metadata: {},
        },
      };
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Create a new agent
   */
  async createAgent(config: AgentConfig): Promise<string> {
    const provider = config.provider || this.defaultProvider;

    const response = await fetch(`${this.pythonServiceUrl}/agents/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: config.name,
        instructions: config.instructions,
        model: config.model,
        tools: config.tools || [],
        provider: provider,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Agent creation failed: ${error}`);
    }

    const data = await response.json();
    return data.agent_id;
  }
}

/**
 * Factory function to create a gateway instance
 */
export function createAgentGateway(
  options?: Partial<AgentOrchestrationOptions>
): UnifiedAgentGateway {
  return new UnifiedAgentGateway({
    defaultProvider: options?.defaultProvider || AgentProvider.OPENAI,
    fallbackProviders: options?.fallbackProviders || [AgentProvider.GEMINI],
    providerConfigs: options?.providerConfigs || {},
  });
}
