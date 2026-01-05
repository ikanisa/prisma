/**
 * ChatKit React Hook
 * 
 * Provides hooks for managing ChatKit sessions and messages
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Widget, WidgetMessage } from '@prisma/lib/openai/chatkit';

export interface ChatKitMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  widgets?: Widget[];
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ChatKitSession {
  id: string;
  agentSessionId: string;
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface UseChatKitOptions {
  sessionId?: string;
  agentType?: string;
  orgSlug?: string;
  stream?: boolean;
  onMessage?: (message: ChatKitMessage) => void;
  onError?: (error: Error) => void;
}

export interface UseChatKitReturn {
  messages: ChatKitMessage[];
  session: ChatKitSession | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: Error | null;
  sendMessage: (message: string, options?: { context?: Record<string, unknown> }) => Promise<void>;
  createSession: (agentSessionId: string, metadata?: Record<string, unknown>) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  cancelSession: () => Promise<void>;
  clearMessages: () => void;
}

export function useChatKit(options: UseChatKitOptions = {}): UseChatKitReturn {
  const { sessionId, agentType, orgSlug, stream = false, onMessage, onError } = options;

  const [messages, setMessages] = useState<ChatKitMessage[]>([]);
  const [session, setSession] = useState<ChatKitSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const currentStreamMessageRef = useRef<ChatKitMessage | null>(null);

  // Load session if sessionId is provided
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId]);

  // Cleanup event source on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const createSession = useCallback(
    async (agentSessionId: string, metadata?: Record<string, unknown>) => {
      try {
        setIsLoading(true);
        setError(null);

        // Generate a unique ChatKit session ID
        const chatkitSessionId = `chatkit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const response = await fetch('/api/chatkit/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentSessionId,
            chatkitSessionId,
            metadata,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to create session' }));
          throw new Error(errorData.error || 'Failed to create session');
        }

        const data = await response.json();
        setSession(data.session);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create session');
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [onError]
  );

  const loadSession = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/chatkit/session?id=${encodeURIComponent(id)}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to load session' }));
          throw new Error(errorData.error || 'Failed to load session');
        }

        const data = await response.json();
        setSession(data.session);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load session');
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [onError]
  );

  const cancelSession = useCallback(async () => {
    if (!session) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/chatkit/session/${session.id}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to cancel session' }));
        throw new Error(errorData.error || 'Failed to cancel session');
      }

      setSession(null);
      setMessages([]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to cancel session');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [session, onError]);

  const sendMessage = useCallback(
    async (message: string, messageOptions?: { context?: Record<string, unknown> }) => {
      if (!session) {
        throw new Error('No active session');
      }

      try {
        setIsLoading(true);
        setIsStreaming(stream);
        setError(null);

        // Add user message to state
        const userMessage: ChatKitMessage = {
          id: `msg_${Date.now()}_user`,
          role: 'user',
          content: message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);

        if (stream) {
          // Handle streaming response
          const response = await fetch('/api/chatkit/message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: session.id,
              message,
              agentType,
              orgSlug,
              context: messageOptions?.context,
              stream: true,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to send message');
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error('No response body');
          }

          // Create assistant message for streaming
          const assistantMessage: ChatKitMessage = {
            id: `msg_${Date.now()}_assistant`,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
          currentStreamMessageRef.current = assistantMessage;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  setIsStreaming(false);
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.text) {
                    setMessages((prev) => {
                      const updated = [...prev];
                      const lastMsg = updated[updated.length - 1];
                      if (lastMsg.role === 'assistant') {
                        lastMsg.content += parsed.text;
                      }
                      return updated;
                    });
                  }
                  if (parsed.widgets) {
                    setMessages((prev) => {
                      const updated = [...prev];
                      const lastMsg = updated[updated.length - 1];
                      if (lastMsg.role === 'assistant') {
                        lastMsg.widgets = parsed.widgets;
                      }
                      return updated;
                    });
                  }
                } catch (e) {
                  // Ignore parse errors for incomplete chunks
                }
              }
            }
          }

          setIsStreaming(false);
        } else {
          // Handle non-streaming response
          const response = await fetch('/api/chatkit/message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: session.id,
              message,
              agentType,
              orgSlug,
              context: messageOptions?.context,
              stream: false,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to send message' }));
            throw new Error(errorData.error || 'Failed to send message');
          }

          const data = await response.json();

          const assistantMessage: ChatKitMessage = {
            id: `msg_${Date.now()}_assistant`,
            role: 'assistant',
            content: data.response?.output || data.output || '',
            widgets: data.widgets || data.response?.widgets,
            timestamp: new Date(),
            metadata: data.metadata,
          };

          setMessages((prev) => [...prev, assistantMessage]);
          onMessage?.(assistantMessage);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to send message');
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
      }
    },
    [session, agentType, orgSlug, stream, onMessage, onError]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    session,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    createSession,
    loadSession,
    cancelSession,
    clearMessages,
  };
}
