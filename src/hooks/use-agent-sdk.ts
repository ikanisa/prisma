/**
 * React Hooks for Agent SDK Integration
 * 
 * Provides hooks for interacting with OpenAI Agents SDK and Gemini ADK
 * powered agents including execution, streaming, and handoffs.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AgentSDKConfig,
  AgentSDKProvider,
  RunAgentRequest,
  AgentRunResponse,
  HandoffRequest,
  StreamingAgentEvent,
  StreamingState,
  AgentSDKError,
  AgentTrace,
  MetricsSummary,
  ABTestResults,
  ProvidersResponse,
  CreateAgentRequest,
  CreateAgentResponse,
} from '../types/agent-sdk';

// ============================================
// API Configuration
// ============================================

const API_BASE = '/api/v3/agents';

async function fetchAPI<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw {
      code: `HTTP_${response.status}`,
      message: error.detail || error.message || `HTTP ${response.status}`,
      details: error,
    } as AgentSDKError;
  }

  return response.json();
}

// ============================================
// Agent Configuration Hooks
// ============================================

/**
 * Fetch agent SDK configuration by ID
 */
export function useAgentSDK(agentId: string | undefined) {
  return useQuery<AgentSDKConfig>({
    queryKey: ['agent-sdk', agentId],
    queryFn: () => fetchAPI<AgentSDKConfig>(`${API_BASE}/${agentId}`),
    enabled: !!agentId,
  });
}

/**
 * Create a new agent with SDK configuration
 */
export function useCreateAgentSDK() {
  const queryClient = useQueryClient();

  return useMutation<CreateAgentResponse, AgentSDKError, CreateAgentRequest>({
    mutationFn: (request) =>
      fetchAPI<CreateAgentResponse>(`${API_BASE}/create`, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-sdk'] });
    },
  });
}

/**
 * List available providers
 */
export function useAgentProviders() {
  return useQuery<ProvidersResponse>({
    queryKey: ['agent-providers'],
    queryFn: () => fetchAPI<ProvidersResponse>(`${API_BASE}/providers`),
  });
}

// ============================================
// Execution Hooks
// ============================================

/**
 * Execute an agent (non-streaming)
 */
export function useRunAgent(agentId: string) {
  return useMutation<AgentRunResponse, AgentSDKError, RunAgentRequest>({
    mutationFn: (request) =>
      fetchAPI<AgentRunResponse>(`${API_BASE}/${agentId}/run`, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
  });
}

/**
 * Stream agent execution with real-time updates
 */
export function useStreamAgent(agentId: string) {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    events: [],
    accumulatedContent: '',
  });
  const [error, setError] = useState<AgentSDKError | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const stream = useCallback(
    async (request: RunAgentRequest) => {
      // Reset state
      setState({
        isStreaming: true,
        events: [],
        accumulatedContent: '',
      });
      setError(null);

      // Abort any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`${API_BASE}/${agentId}/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedContent = '';
        const events: StreamingAgentEvent[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6)) as StreamingAgentEvent;
                events.push(event);

                if (event.type === 'text') {
                  accumulatedContent += event.content;
                }

                setState((prev) => ({
                  ...prev,
                  events: [...prev.events, event],
                  accumulatedContent,
                  currentToolCall:
                    event.type === 'tool_call'
                      ? {
                          id: event.tool_call_id || '',
                          name: event.tool_name || '',
                          arguments: event.tool_arguments || {},
                        }
                      : event.type === 'tool_result'
                      ? undefined
                      : prev.currentToolCall,
                }));

                if (event.type === 'done' || event.type === 'error') {
                  setState((prev) => ({ ...prev, isStreaming: false }));
                  if (event.type === 'error') {
                    setError({
                      code: 'STREAM_ERROR',
                      message: event.content,
                    });
                  }
                }
              } catch {
                // Ignore parse errors for incomplete data
              }
            }
          }
        }

        setState((prev) => ({ ...prev, isStreaming: false }));
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          setState((prev) => ({ ...prev, isStreaming: false }));
          return;
        }
        setError({
          code: 'STREAM_ERROR',
          message: (e as Error).message,
        });
        setState((prev) => ({ ...prev, isStreaming: false }));
      }
    },
    [agentId]
  );

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    stream,
    stopStream,
    state,
    error,
  };
}

/**
 * Execute agent handoff to another agent
 */
export function useAgentHandoff(agentId: string) {
  return useMutation<AgentRunResponse, AgentSDKError, HandoffRequest>({
    mutationFn: (request) =>
      fetchAPI<AgentRunResponse>(`${API_BASE}/${agentId}/handoff`, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
  });
}

// ============================================
// Observability Hooks
// ============================================

/**
 * Fetch execution traces for an agent
 */
export function useAgentTraces(agentId: string | undefined, limit: number = 100) {
  return useQuery<AgentTrace[]>({
    queryKey: ['agent-traces', agentId, limit],
    queryFn: () =>
      fetchAPI<AgentTrace[]>(`${API_BASE}/${agentId}/traces?limit=${limit}`),
    enabled: !!agentId,
  });
}

/**
 * Fetch metrics summary
 */
export function useAgentMetrics(params?: {
  agentId?: string;
  provider?: AgentSDKProvider;
  lastN?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.agentId) queryParams.set('agent_id', params.agentId);
  if (params?.provider) queryParams.set('provider', params.provider);
  if (params?.lastN) queryParams.set('last_n', params.lastN.toString());

  return useQuery<MetricsSummary>({
    queryKey: ['agent-metrics', params],
    queryFn: () =>
      fetchAPI<MetricsSummary>(`${API_BASE}/metrics/summary?${queryParams}`),
  });
}

// ============================================
// A/B Testing Hooks
// ============================================

/**
 * Get A/B test results
 */
export function useABTestResults(testName: string | undefined) {
  return useQuery<ABTestResults>({
    queryKey: ['ab-test', testName],
    queryFn: () => fetchAPI<ABTestResults>(`${API_BASE}/ab-test/${testName}`),
    enabled: !!testName,
  });
}

/**
 * Configure A/B test
 */
export function useConfigureABTest() {
  const queryClient = useQueryClient();

  return useMutation<
    { status: string; test_name: string },
    AgentSDKError,
    {
      name: string;
      controlProvider: AgentSDKProvider;
      treatmentProvider: AgentSDKProvider;
      treatmentPercentage?: number;
    }
  >({
    mutationFn: (params) => {
      const queryParams = new URLSearchParams({
        name: params.name,
        control_provider: params.controlProvider,
        treatment_provider: params.treatmentProvider,
        treatment_percentage: (params.treatmentPercentage || 50).toString(),
      });
      return fetchAPI(`${API_BASE}/ab-test/configure?${queryParams}`, {
        method: 'POST',
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ab-test', variables.name] });
    },
  });
}

/**
 * Disable A/B test
 */
export function useDisableABTest() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string }, AgentSDKError, string>({
    mutationFn: (testName) =>
      fetchAPI(`${API_BASE}/ab-test/${testName}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, testName) => {
      queryClient.invalidateQueries({ queryKey: ['ab-test', testName] });
    },
  });
}

// ============================================
// Combined Hook for Chat-like Experience
// ============================================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
    result?: unknown;
  }>;
  isStreaming?: boolean;
  error?: string;
}

interface UseChatAgentOptions {
  agentId: string;
  streaming?: boolean;
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: AgentSDKError) => void;
}

export function useChatAgent({ agentId, streaming = true, onMessage, onError }: UseChatAgentOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { stream, stopStream, state: streamState } = useStreamAgent(agentId);
  const runMutation = useRunAgent(agentId);

  const sendMessage = useCallback(
    async (content: string, context?: Record<string, unknown>) => {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      const assistantMessageId = `assistant-${Date.now()}`;

      if (streaming) {
        // Add placeholder message for streaming
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            isStreaming: true,
          },
        ]);

        stream({ input_text: content, context });
      } else {
        try {
          const response = await runMutation.mutateAsync({
            input_text: content,
            context,
          });

          const assistantMessage: ChatMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: response.content,
            toolCalls: response.tool_calls.map((tc) => ({
              name: tc.name,
              arguments: tc.arguments,
              result: tc.result,
            })),
          };

          setMessages((prev) => [...prev, assistantMessage]);
          onMessage?.(assistantMessage);
        } catch (e) {
          const error = e as AgentSDKError;
          onError?.(error);
          setMessages((prev) => [
            ...prev,
            {
              id: assistantMessageId,
              role: 'assistant',
              content: '',
              error: error.message,
            },
          ]);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [agentId, streaming, stream, runMutation, onMessage, onError]
  );

  // Update messages from streaming state
  useEffect(() => {
    if (!streaming) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.isStreaming) {
      const toolCalls = streamState.events
        .filter((e) => e.type === 'tool_call' || e.type === 'tool_result')
        .reduce((acc, event) => {
          if (event.type === 'tool_call') {
            acc.push({
              name: event.tool_name || '',
              arguments: event.tool_arguments || {},
            });
          } else if (event.type === 'tool_result' && acc.length > 0) {
            const lastTool = acc[acc.length - 1];
            try {
              lastTool.result = JSON.parse(event.content);
            } catch {
              lastTool.result = event.content;
            }
          }
          return acc;
        }, [] as Array<{ name: string; arguments: Record<string, unknown>; result?: unknown }>);

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...lastMessage,
          content: streamState.accumulatedContent,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          isStreaming: streamState.isStreaming,
        };
        return updated;
      });

      if (!streamState.isStreaming) {
        setIsLoading(false);
        const finalMessage = {
          ...lastMessage,
          content: streamState.accumulatedContent,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          isStreaming: false,
        };
        onMessage?.(finalMessage);
      }
    }
  }, [streaming, streamState, messages, onMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading: isLoading || streamState.isStreaming,
    stopStreaming: stopStream,
  };
}
