import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex gap-3 justify-start', className)}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="text-xs">AI</AvatarFallback>
      </Avatar>
      
      <div className="bg-muted text-foreground rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <div className="flex gap-1">
            <div 
              className="w-2 h-2 bg-current rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <div 
              className="w-2 h-2 bg-current rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <div 
              className="w-2 h-2 bg-current rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span className="text-xs text-muted-foreground ml-2">AI is typing...</span>
        </div>
      </div>
    </div>
  );
}