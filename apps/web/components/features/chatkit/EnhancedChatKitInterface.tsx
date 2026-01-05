/**
 * Enhanced ChatKit Interface
 * 
 * Redesigned with full widget support, animations, and modern AI agent design
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatKit } from '@/hooks/use-chatkit';
import { EnhancedWidgetRenderer } from './EnhancedWidgetRenderer';
import { AnimatedPage, StreamingText, Spinner } from '@/components/ui/animated';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Send, Bot, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetComponent, Text, Card as CardWidget, Form, Button as ButtonWidget } from '@prisma/lib/openai/chatkit/widgets-complete';
import { createText, createCard, createForm, createButton } from '@prisma/lib/openai/chatkit/widgets-complete';

export interface EnhancedChatKitInterfaceProps {
  agentSessionId: string;
  agentType?: string;
  orgSlug?: string;
  stream?: boolean;
  onSessionCreate?: (sessionId: string) => void;
  onWidgetAction?: (widgetId: string, action: { type: string; callback?: string; data?: Record<string, unknown> }) => void;
}

export function EnhancedChatKitInterface({
  agentSessionId,
  agentType,
  orgSlug,
  stream = false,
  onSessionCreate,
  onWidgetAction,
}: EnhancedChatKitInterfaceProps) {
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

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !session || isLoading) return;

    const content = input.trim();
    setInput('');
    await sendMessage(content);
    inputRef.current?.focus();
  };

  const handleWidgetAction = (action: { type: string; payload?: Record<string, unknown> }) => {
    if (onWidgetAction) {
      onWidgetAction(action.type, action);
    }

    // Handle default actions
    if (action.type === 'submit' && action.payload) {
      console.log('Form submitted:', action.payload);
    }
  };

  if (!session && isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">Initializing chat session...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatedPage className="flex h-full flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Enhanced Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b bg-card/50 backdrop-blur-sm p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Bot className="h-6 w-6 text-primary" />
            </motion.div>
            <div>
              <h2 className="text-lg font-semibold">AI Assistant</h2>
              {session && (
                <p className="text-xs text-muted-foreground">
                  Session: {session.id.slice(0, 8)}...
                </p>
              )}
            </div>
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
      </motion.div>

      {/* Messages Area with Widgets */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex h-full flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mb-4 rounded-full bg-primary/10 p-6"
              >
                <Sparkles className="h-12 w-12 text-primary" />
              </motion.div>
              <h3 className="mb-2 text-xl font-semibold">Start a Conversation</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                Ask me anything about your accounting, audit, or tax needs.
              </p>
            </motion.div>
          ) : (
            messages.map((message, index) => {
              const isUser = message.role === 'user';
              const hasWidgets = message.widgets && message.widgets.length > 0;

              return (
                <motion.div
                  key={message.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    'flex',
                    isUser ? 'justify-end' : 'justify-start'
                  )}
                >
                  <motion.div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-3',
                      isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border shadow-sm'
                    )}
                    whileHover={{ scale: 1.02 }}
                  >
                    {!isUser && message.content && (
                      <div className="mb-2">
                        {stream && isStreaming && index === messages.length - 1 ? (
                          <StreamingText text={message.content} streaming={true} />
                        ) : (
                          <p className="text-sm">{message.content}</p>
                        )}
                      </div>
                    )}
                    {isUser && (
                      <p className="text-sm">{message.content}</p>
                    )}
                    {hasWidgets && (
                      <div className="mt-3 space-y-3">
                        {message.widgets.map((widget, widgetIndex) => (
                          <EnhancedWidgetRenderer
                            key={widget.id || widgetIndex}
                            widget={widget as WidgetComponent}
                            onAction={handleWidgetAction}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
        {isLoading && !isStreaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <Spinner size="sm" />
            <span className="text-sm">Thinking...</span>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mx-4 mb-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3"
        >
          <p className="text-sm text-destructive">{error.message}</p>
        </motion.div>
      )}

      {/* Enhanced Input Area */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-t bg-card/50 backdrop-blur-sm p-4"
      >
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={session ? 'Type your message...' : 'Waiting for session...'}
            disabled={isLoading || !session}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading || !session}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </motion.div>
    </AnimatedPage>
  );
}

