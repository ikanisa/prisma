import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, StopCircle, Trash2 } from 'lucide-react';
import { useGeminiChat } from '@/hooks/gemini/useGeminiChat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export function GeminiChat() {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    sendMessageStream,
    stopStreaming,
    clearMessages,
  } = useGeminiChat({
    model: 'gemini-2.0-flash-exp',
    temperature: 0.7,
    onError: (error) => {
      console.error('Gemini error:', error);
    },
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isStreaming) return;

    const message = input.trim();
    setInput('');

    try {
      await sendMessageStream(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Gemini Assistant</h2>
            <p className="text-xs text-muted-foreground">Powered by Google AI</p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={clearMessages}
          disabled={messages.length === 0}
          className="h-8 px-2"
        >
          <Trash2 className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Clear</span>
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {/* Empty State */}
          {messages.length === 0 && !isStreaming && (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30">
                <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Start a conversation</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                Ask me anything about your audit or tax work. I can help with analysis, research, and recommendations.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInput("Summarize the latest audit findings")}
                  className="text-xs"
                >
                  Summarize audit findings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInput("What are the key tax considerations for Q4?")}
                  className="text-xs"
                >
                  Tax considerations
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInput("Help me draft a risk assessment report")}
                  className="text-xs"
                >
                  Draft risk report
                </Button>
              </div>
            </div>
          )}

          {/* Message List */}
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'flex gap-3 animate-in fade-in slide-in-from-bottom-2',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {/* Assistant Avatar */}
              {message.role === 'assistant' && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={cn(
                  'group relative max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 border border-border'
                )}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </p>
                <span className="mt-1 block text-[10px] opacity-50">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* User Avatar */}
              {message.role === 'user' && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
                  <span className="text-xs font-medium text-primary">You</span>
                </div>
              )}
            </div>
          ))}

          {/* Streaming Message */}
          {isStreaming && streamingContent && (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Sparkles className="h-4 w-4 animate-pulse text-purple-600 dark:text-purple-400" />
              </div>
              
              <div className="max-w-[85%] rounded-2xl border border-border bg-muted/50 px-4 py-2.5 shadow-sm">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {streamingContent}
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground" />
                </p>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && !isStreaming && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Sparkles className="h-4 w-4 animate-pulse text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Gemini anything..."
            className="min-h-[60px] max-h-32 resize-none"
            disabled={isStreaming}
          />

          {isStreaming ? (
            <Button
              type="button"
              onClick={stopStreaming}
              variant="destructive"
              size="icon"
              className="h-[60px] w-[60px] flex-shrink-0"
            >
              <StopCircle className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-[60px] w-[60px] flex-shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          )}
        </form>
        
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Gemini can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
