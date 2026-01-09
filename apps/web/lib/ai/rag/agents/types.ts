/**
 * Type definitions for multi-provider AI agent system
 */

export enum AgentProvider {
  OPENAI = 'openai',
  GEMINI = 'gemini',
  ANTHROPIC = 'anthropic',
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler?: (...args: unknown[]) => Promise<unknown>;
}

export interface AgentConfig {
  name: string;
  instructions: string;
  model: string;
  tools?: ToolDefinition[];
  provider?: AgentProvider;
}

export interface AgentRequest {
  agentId: string;
  input: string;
  context?: Record<string, unknown>;
  provider?: AgentProvider;
  stream?: boolean;
}

export interface AgentResponse {
  content: string;
  toolCalls: ToolCall[];
  usage: TokenUsage;
  provider: AgentProvider;
  metadata: Record<string, unknown>;
}

export interface ToolCall {
  id?: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface StreamEvent {
  type: 'content_delta' | 'tool_call' | 'done' | 'error';
  data: AgentResponse | Error;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface AgentOrchestrationOptions {
  defaultProvider: AgentProvider;
  fallbackProviders?: AgentProvider[];
  providerConfigs?: Record<AgentProvider, ProviderConfig>;
}
