import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat } from './ChatProvider';

interface ConnectionStatusProps {
  className?: string;
}

export function ConnectionStatus({ className }: ConnectionStatusProps) {
  const { isConnected } = useChat();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge
        variant={isConnected ? "default" : "destructive"}
        className="flex items-center gap-1"
      >
        {isConnected ? (
          <>
            <Wifi className="h-3 w-3" />
            Connected
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            Disconnected
          </>
        )}
      </Badge>
      
      {!isConnected && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <AlertCircle className="h-3 w-3" />
          Reconnecting...
        </div>
      )}
    </div>
  );
}