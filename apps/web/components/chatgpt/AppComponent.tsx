/**
 * ChatGPT App Component
 * 
 * UI component for ChatGPT App Store integration
 * Renders in iframe within ChatGPT interface
 */

'use client';

import { useEffect, useState } from 'react';
import { ChatKitInterface } from '@/components/features/chatkit/ChatKitInterface';
import { useAuth } from '@/components/features/auth/auth-provider';

declare global {
  interface Window {
    openai?: {
      postMessage: (message: any) => void;
      addEventListener: (event: string, handler: (event: any) => void) => void;
      removeEventListener: (event: string, handler: (event: any) => void) => void;
    };
  }
}

export interface ChatGPTAppComponentProps {
  sessionId?: string;
}

export function ChatGPTAppComponent({ sessionId }: ChatGPTAppComponentProps) {
  const { user } = useAuth();
  const [chatSessionId, setChatSessionId] = useState<string>(sessionId || `chatgpt_${Date.now()}`);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if running in ChatGPT iframe
    if (typeof window !== 'undefined' && window.openai) {
      setIsReady(true);

      // Listen for messages from ChatGPT
      const handleMessage = (event: any) => {
        console.log('Message from ChatGPT:', event);
        // Handle messages from ChatGPT parent window
      };

      window.openai.addEventListener('message', handleMessage);

      // Notify ChatGPT that app is ready
      window.openai.postMessage({
        type: 'ready',
        sessionId: chatSessionId,
      });

      return () => {
        window.openai?.removeEventListener('message', handleMessage);
      };
    } else {
      // Not in ChatGPT iframe, use regular session
      setIsReady(true);
    }
  }, [chatSessionId]);

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <ChatKitInterface
        agentSessionId={chatSessionId}
        onSessionCreate={(id) => {
          setChatSessionId(id);
          // Notify ChatGPT of session creation
          if (window.openai) {
            window.openai.postMessage({
              type: 'session_created',
              sessionId: id,
            });
          }
        }}
        onWidgetAction={(widgetId, action) => {
          // Handle widget actions and notify ChatGPT
          if (window.openai) {
            window.openai.postMessage({
              type: 'widget_action',
              widgetId,
              action,
            });
          }
        }}
      />
    </div>
  );
}

