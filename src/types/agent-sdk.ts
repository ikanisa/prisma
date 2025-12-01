/**
 * Agent SDK TypeScript Types
 * 
 * Types for OpenAI Agents SDK and Gemini ADK integration.
 * Supports agent configuration, streaming responses, tools, handoffs, and guardrails.
 */

// ============================================
// Provider Types
// ============================================

export type AgentSDKProvider = 'openai-agents' | 'gemini-adk';

export type StreamingEventType = 
  | 'text' 
  | 'tool_call' 
  | 'tool_result' 
  | 'handoff' 
  | 'guardrail'
  | 'error' 
  | 'done';

// ============================================
// Tool Types
// ============================================

export interface AgentToolParameter {
  type: string;
  description?: string;
  required?: boolean;
  enum?: string[];
  items?: AgentToolParameter;
  properties?: Record<string, AgentToolParameter>;
}

export interface AgentToolSchema {
  type: 'object';
  properties: Record<string, AgentToolParameter>;
  required?: string[];
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: AgentToolSchema;
}

export interface ToolCallResult {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

// ============================================
// Handoff Types
// ============================================

export interface AgentHandoff {
  target_agent_id: string;
  name: string;
  description: string;
  condition?: string;
}

export interface HandoffResult {
  source_agent: string;
  target_agent: string;
  success: boolean;
  error?: string;
}

// ============================================
// Guardrail Types
// ============================================

export type GuardrailType = 'input' | 'output' | 'tool_call';

export interface Guardrail {
  name: string;
  description: string;
  type: GuardrailType;
  config?: Record<string, unknown>;
}

export interface GuardrailResult {
  name: string;
  allowed: boolean;
  message?: string;
  modified_content?: string;
}

// ============================================
// Agent Configuration Types
// ============================================

export interface AgentSDKConfig {
  provider: AgentSDKProvider;
  model: string;
  name: string;
  instructions: string;
  tools: AgentTool[];
  handoffs?: AgentHandoff[];
  guardrails?: Guardrail[];
  temperature?: number;
  max_tokens?: number;
}

export interface CreateAgentRequest {
  name: string;
  instructions: string;
  model: string;
  provider: AgentSDKProvider;
  tools: AgentTool[];
  handoffs?: AgentHandoff[];
  guardrails?: Guardrail[];
}

export interface CreateAgentResponse {
  agent_id: string;
  name: string;
  provider: AgentSDKProvider;
  model: string;
  tools_count: number;
  handoffs_count: number;
  guardrails_count: number;
  created_at: string;
}

// ============================================
// Execution Types
// ============================================

export interface RunAgentRequest {
  input_text: string;
  context?: Record<string, unknown>;
  ab_test_name?: string;
}

export interface AgentRunResponse {
  content: string;
  tool_calls: ToolCallResult[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  provider: AgentSDKProvider;
  metadata: Record<string, unknown>;
  trace_id?: string;
}

export interface HandoffRequest {
  target_agent_id: string;
  input_text: string;
  context?: Record<string, unknown>;
}

// ============================================
// Streaming Types
// ============================================

export interface StreamingAgentEvent {
  type: StreamingEventType;
  content: string;
  metadata?: Record<string, unknown>;
  tool_name?: string;
  tool_call_id?: string;
  tool_arguments?: Record<string, unknown>;
  handoff_agent_id?: string;
}

export interface StreamingAgentResponse {
  type: StreamingEventType;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface StreamingState {
  isStreaming: boolean;
  events: StreamingAgentEvent[];
  accumulatedContent: string;
  currentToolCall?: {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  };
  error?: string;
}

// ============================================
// Trace Types
// ============================================

export interface AgentTrace {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  operation: string;
  start_time: number;
  end_time?: number;
  status: 'in_progress' | 'completed' | 'error' | 'blocked';
  latency_ms?: number;
  metadata: Record<string, unknown>;
  events: Array<{
    name: string;
    timestamp: number;
    attributes?: Record<string, unknown>;
  }>;
}

// ============================================
// Metrics Types
// ============================================

export interface ExecutionMetrics {
  execution_id: string;
  agent_id: string;
  provider: AgentSDKProvider;
  start_time: number;
  end_time?: number;
  latency_ms?: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  success: boolean;
  error_message?: string;
  ab_variant?: 'control' | 'treatment';
}

export interface MetricsSummary {
  count: number;
  success_rate: number;
  avg_latency_ms: number;
  total_tokens: number;
  by_provider: Record<AgentSDKProvider, number>;
}

// ============================================
// A/B Test Types
// ============================================

export interface ABTestConfig {
  name: string;
  control_provider: AgentSDKProvider;
  treatment_provider: AgentSDKProvider;
  treatment_percentage: number;
  is_active: boolean;
}

export interface ABTestResults {
  test_name: string;
  is_active: boolean;
  control: {
    provider: AgentSDKProvider;
    stats: {
      count: number;
      success_rate: number;
      avg_latency_ms: number;
      total_tokens: number;
    };
  };
  treatment: {
    provider: AgentSDKProvider;
    percentage: number;
    stats: {
      count: number;
      success_rate: number;
      avg_latency_ms: number;
      total_tokens: number;
    };
  };
}

// ============================================
// Provider Info Types
// ============================================

export interface ProviderInfo {
  name: AgentSDKProvider;
  type: string;
  available: boolean;
}

export interface ProvidersResponse {
  providers: ProviderInfo[];
  default: AgentSDKProvider;
}

// ============================================
// Error Types
// ============================================

export interface AgentSDKError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  trace_id?: string;
}

// ============================================
// Hook Return Types
// ============================================

export interface UseAgentSDKReturn {
  agent: AgentSDKConfig | null;
  isLoading: boolean;
  error: AgentSDKError | null;
  refetch: () => void;
}

export interface UseRunAgentReturn {
  run: (request: RunAgentRequest) => Promise<AgentRunResponse>;
  isRunning: boolean;
  error: AgentSDKError | null;
  lastResponse: AgentRunResponse | null;
}

export interface UseStreamAgentReturn {
  stream: (request: RunAgentRequest) => void;
  stopStream: () => void;
  state: StreamingState;
  error: AgentSDKError | null;
}

export interface UseAgentHandoffReturn {
  handoff: (request: HandoffRequest) => Promise<AgentRunResponse>;
  isLoading: boolean;
  error: AgentSDKError | null;
  lastResponse: AgentRunResponse | null;
}
