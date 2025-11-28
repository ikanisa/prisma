import { useState, useCallback, useRef } from 'react';
import { geminiClient, GeminiMessage } from '@/services/gemini/gemini-client';

export interface UseGeminiChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  onError?: (error: Error) => void;
}

export function useGeminiChat(options: UseGeminiChatOptions = {}) {
  const [messages, setMessages] = useState<GeminiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: GeminiMessage = {
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await geminiClient.chat({
        messages: [...messages, userMessage],
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });

      const assistantMessage: GeminiMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [messages, options]);

  const sendMessageStream = useCallback(async (content: string) => {
    const userMessage: GeminiMessage = {
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingContent('');

    abortControllerRef.current = new AbortController();

    try {
      const stream = geminiClient.chatStream({
        messages: [...messages, userMessage],
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        stream: true,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        if (chunk.done) {
          break;
        }

        fullContent += chunk.content;
        setStreamingContent(fullContent);
      }

      const assistantMessage: GeminiMessage = {
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setStreamingContent('');
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [messages, options]);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingContent('');
  }, []);

  return {
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    sendMessage,
    sendMessageStream,
    stopStreaming,
    clearMessages,
  };
}
