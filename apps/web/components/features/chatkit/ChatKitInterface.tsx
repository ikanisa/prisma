/**
 * ChatKit Interface Component
 * 
 * Full-featured ChatKit interface with widget support
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { useChatKit } from '@/hooks/use-chatkit';
import { MessageBubble } from '../chat/MessageBubble';
import { ChatInput } from '../chat/ChatInput';
import { WidgetRenderer } from './WidgetRenderer';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Widget } from '@prisma/lib/openai/chatkit';

export interface ChatKitInterfaceProps {
  agentSessionId: string;
  agentType?: string;
  orgSlug?: string;
  stream?: boolean;
  onSessionCreate?: (sessionId: string) => void;
  onWidgetAction?: (widgetId: string, action: { type: string; callback?: string; data?: Record<string, unknown> }) => void;
}

export function ChatKitInterface({
  agentSessionId,
  agentType,
  orgSlug,
  stream = false,
  onSessionCreate,
  onWidgetAction,
}: ChatKitInterfaceProps) {
  const {
    messages,
    session,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    createSession,
    cancelSession,
    clearMessages,
  } = useChatKit({
    agentType,
    orgSlug,
    stream,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Create session on mount
  useEffect(() => {
    if (agentSessionId && !session) {
      createSession(agentSessionId).then(() => {
        if (session?.id && onSessionCreate) {
          onSessionCreate(session.id);
        }
      });
    }
  }, [agentSessionId, session, createSession, onSessionCreate]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!session) {
      console.error('No active session');
      return;
    }

    await sendMessage(content);
  };

  const handleWidgetAction = (action: { type: string; callback?: string; data?: Record<string, unknown> }) => {
    if (onWidgetAction) {
      onWidgetAction(action.callback || 'unknown', action);
    }

    // Handle default actions
    if (action.type === 'submit' && action.data) {
      // You can handle form submissions here
      console.log('Form submitted:', action.data);
    }
  };

  if (!session && isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">ChatKit</h2>
            {session && (
              <p className="text-xs text-muted-foreground">Session: {session.id.slice(0, 8)}...</p>
            )}
          </div>
          {session && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                cancelSession();
                clearMessages();
              }}
            >
              <X className="h-4 w-4 mr-2" />
              End Session
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <svg
                className="h-12 w-12 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold">Start a Conversation</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Send a message to start chatting with the AI assistant.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {messages.map((message) => (
              <div key={message.id}>
                <MessageBubble
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                />
                {/* Render widgets if present */}
                {message.widgets && message.widgets.length > 0 && (
                  <div className="px-4 pb-4 space-y-3">
                    {message.widgets.map((widget, index) => (
                      <WidgetRenderer
                        key={widget.id || index}
                        widget={widget}
                        onAction={handleWidgetAction}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && !isStreaming && (
              <MessageBubble
                role="assistant"
                content=""
                isLoading
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error.message}
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-card p-4">
        <ChatInput
          onSend={handleSend}
          disabled={isLoading || !session}
          placeholder={session ? 'Type your message...' : 'Waiting for session...'}
        />
      </div>
    </div>
  );
}
