/**
 * Agent Streaming Chat Component
 * 
 * Real-time streaming display for agent responses with tool call visualization,
 * handoff indicators, and provider badge support.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatAgent, useAgentProviders } from '../../hooks/use-agent-sdk';
import type { AgentSDKProvider, StreamingAgentEvent } from '../../types/agent-sdk';

// ============================================
// Sub-Components
// ============================================

interface ProviderBadgeProps {
  provider: AgentSDKProvider;
}

export function ProviderBadge({ provider }: ProviderBadgeProps) {
  const isOpenAI = provider === 'openai-agents';
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isOpenAI
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      }`}
    >
      {isOpenAI ? (
        <>
          <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.6 8.3829l2.02-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4068-.6758zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
          </svg>
          OpenAI
        </>
      ) : (
        <>
          <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 16.5c-1.4 1.4-3.3 2.2-5.3 2.2-4.1 0-7.5-3.4-7.5-7.5 0-2 .8-3.9 2.2-5.3l.7.7C6.5 7.7 5.8 9.3 5.8 11c0 3.4 2.8 6.2 6.2 6.2 1.7 0 3.3-.7 4.4-1.9l.1.2zm1.2-5.3c0 .4 0 .8-.1 1.1l-.9-.2c0-.3.1-.6.1-.9 0-3.4-2.8-6.2-6.2-6.2-1.7 0-3.3.7-4.4 1.9l-.7-.7c1.4-1.4 3.3-2.2 5.3-2.2 4 0 7.3 3.4 7.3 7.5z" />
          </svg>
          Gemini
        </>
      )}
    </span>
  );
}

interface ToolCallVisualizationProps {
  toolName: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  isLoading?: boolean;
}

export function ToolCallVisualization({
  toolName,
  arguments: args,
  result,
  isLoading,
}: ToolCallVisualizationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="my-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isLoading ? (
            <svg
              className="animate-spin h-4 w-4 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
          <span className="font-mono text-sm font-medium text-gray-700 dark:text-gray-300">
            {toolName}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-3 bg-white dark:bg-gray-900 space-y-2">
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Arguments
            </span>
            <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>
          {result !== undefined && (
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Result
              </span>
              <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface HandoffIndicatorProps {
  sourceAgent: string;
  targetAgent: string;
}

export function HandoffIndicator({ sourceAgent, targetAgent }: HandoffIndicatorProps) {
  return (
    <div className="flex items-center gap-2 py-2 px-3 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded-r-lg my-2">
      <svg
        className="w-5 h-5 text-purple-600 dark:text-purple-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 5l7 7-7 7M5 5l7 7-7 7"
        />
      </svg>
      <span className="text-sm text-purple-700 dark:text-purple-300">
        Handoff: <span className="font-medium">{sourceAgent}</span> →{' '}
        <span className="font-medium">{targetAgent}</span>
      </span>
    </div>
  );
}

interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
}

export function StreamingText({ content, isStreaming }: StreamingTextProps) {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <p className="whitespace-pre-wrap">
        {content}
        {isStreaming && (
          <span className="inline-block w-2 h-4 ml-0.5 bg-gray-400 animate-pulse" />
        )}
      </p>
    </div>
  );
}

// ============================================
// Main Chat Component
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
  provider?: AgentSDKProvider;
  handoff?: {
    source: string;
    target: string;
  };
}

interface AgentStreamingChatProps {
  agentId: string;
  provider?: AgentSDKProvider;
  streaming?: boolean;
  placeholder?: string;
  showProviderBadge?: boolean;
  onMessage?: (message: ChatMessage) => void;
  className?: string;
}

export function AgentStreamingChat({
  agentId,
  provider = 'openai-agents',
  streaming = true,
  placeholder = 'Ask a question...',
  showProviderBadge = true,
  onMessage,
  className = '',
}: AgentStreamingChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    sendMessage,
    clearMessages,
    isLoading,
    stopStreaming,
  } = useChatAgent({
    agentId,
    streaming,
    onMessage,
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const messageContent = input.trim();
    setInput('');
    await sendMessage(messageContent);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">Agent Chat</h3>
          {showProviderBadge && <ProviderBadge provider={provider} />}
        </div>
        <button
          onClick={clearMessages}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <p>Start a conversation with the agent</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
              }`}
            >
              {message.error ? (
                <div className="flex items-center gap-2 text-red-500">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{message.error}</span>
                </div>
              ) : (
                <>
                  {message.handoff && (
                    <HandoffIndicator
                      sourceAgent={message.handoff.source}
                      targetAgent={message.handoff.target}
                    />
                  )}

                  <StreamingText
                    content={message.content}
                    isStreaming={message.isStreaming || false}
                  />

                  {message.toolCalls?.map((tool, idx) => (
                    <ToolCallVisualization
                      key={`${message.id}-tool-${idx}`}
                      toolName={tool.name}
                      arguments={tool.arguments}
                      result={tool.result}
                      isLoading={!tool.result && message.isStreaming}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <label htmlFor="agent-chat-input" className="sr-only">
          Message input
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="agent-chat-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={isLoading}
            aria-label="Enter your message"
            aria-describedby="chat-input-hint"
            className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          <span id="chat-input-hint" className="sr-only">
            Press Enter to send or Shift+Enter for a new line
          </span>
          {isLoading && streaming ? (
            <button
              type="button"
              onClick={stopStreaming}
              aria-label="Stop streaming"
              className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default AgentStreamingChat;
