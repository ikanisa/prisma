import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  phone_number: string;
  sender: string;
  message_text: string;
  model_used?: string;
  confidence_score?: number;
  created_at: string;
}

interface ConversationViewProps {
  phoneNumber: string;
  onClose?: () => void;
}

export function ConversationView({ phoneNumber, onClose }: ConversationViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to new messages for this phone number
    const subscription = supabase
      .channel(`conversation:${phoneNumber}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'conversation_messages',
          filter: `phone_number=eq.${phoneNumber}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [phoneNumber]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('phone_number', phoneNumber)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-[600px]">
        <CardContent className="flex items-center justify-center h-full">
          <div>Loading conversation...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Conversation: {phoneNumber}</CardTitle>
          {onClose && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isAgent = message.sender === 'agent';
  
  return (
    <div className={cn('flex gap-3', isAgent ? 'justify-start' : 'justify-end')}>
      {isAgent && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
      )}
      <div className={cn(
        'rounded-lg px-4 py-2 max-w-[80%]',
        isAgent 
          ? 'bg-muted text-foreground' 
          : 'bg-primary text-primary-foreground'
      )}>
        <p className="text-sm">{message.message_text}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs opacity-70">
            {new Date(message.created_at).toLocaleTimeString()}
          </span>
          {isAgent && message.model_used && (
            <Badge variant="secondary" className="text-xs">
              {message.model_used}
            </Badge>
          )}
          {isAgent && message.confidence_score && (
            <span className="text-xs opacity-70">
              {Math.round(message.confidence_score * 100)}%
            </span>
          )}
        </div>
      </div>
      {!isAgent && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}