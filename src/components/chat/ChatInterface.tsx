import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Phone, 
  Video,
  ArrowLeft,
  Search,
  Mic,
  Image as ImageIcon,
  File,
  Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { FileUploader } from './FileUploader';
import { EmojiPicker } from './EmojiPicker';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  phone_number: string;
  sender: string;
  message_text: string;
  message_type?: 'text' | 'image' | 'file' | 'audio' | 'video';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  model_used?: string;
  confidence_score?: number;
  created_at: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  reply_to?: string;
  reactions?: Array<{
    emoji: string;
    user: string;
    timestamp: string;
  }>;
}

interface Contact {
  phone_number: string;
  name?: string;
  avatar_url?: string;
  last_seen?: string;
  is_online?: boolean;
  is_typing?: boolean;
}

interface ChatInterfaceProps {
  contactPhone: string;
  onClose?: () => void;
  className?: string;
  isFullScreen?: boolean;
}

export function ChatInterface({ 
  contactPhone, 
  onClose, 
  className,
  isFullScreen = false 
}: ChatInterfaceProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [contact, setContact] = useState<Contact | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch messages and contact info
  useEffect(() => {
    fetchMessages();
    fetchContactInfo();
    
    // Subscribe to new messages
    const subscription = supabase
      .channel(`chat:${contactPhone}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'conversation_messages',
          filter: `phone_number=eq.${contactPhone}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => {
            const exists = prev.find(m => m.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
          scrollToBottom();
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_messages',
          filter: `phone_number=eq.${contactPhone}`
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages(prev => prev.map(m => 
            m.id === updatedMessage.id ? updatedMessage : m
          ));
        }
      )
      .subscribe();

    // Subscribe to typing indicators
    const typingSubscription = supabase
      .channel(`typing:${contactPhone}`)
      .on('presence', { event: 'sync' }, () => {
        const state = typingSubscription.presenceState();
        const typingUsers = Object.values(state).flat();
        setIsTyping(typingUsers.some((user: any) => user.is_typing && user.phone !== contactPhone));
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      typingSubscription.unsubscribe();
    };
  }, [contactPhone, scrollToBottom]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('phone_number', contactPhone)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContactInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('phone_number', contactPhone)
        .single();

      if (data) {
        setContact({
          phone_number: contactPhone,
          name: data.name,
          avatar_url: '', // Not in current schema
          last_seen: data.last_interaction,
          is_online: false // This would come from real-time presence
        });
      }
    } catch (error) {
      console.error('Error fetching contact:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !replyingTo) return;
    
    setIsSending(true);
    try {
      const messageData = {
        phone_number: contactPhone,
        sender: 'user',
        message_text: inputText.trim(),
        message_type: 'text' as const,
        status: 'sending' as const,
        reply_to: replyingTo?.id || null,
        created_at: new Date().toISOString()
      };

      // Optimistic update
      const tempMessage: Message = {
        ...messageData,
        id: `temp_${Date.now()}`,
      };
      setMessages(prev => [...prev, tempMessage]);

      // Send to backend
      const { data, error } = await supabase
        .from('conversation_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      // Replace temp message with real one
      setMessages(prev => prev.map(m => 
        m.id === tempMessage.id ? { ...data, status: 'sent' } : m
      ));

      // Send to AI processor
      await supabase.functions.invoke('unified-message-handler', {
        body: {
          platform: 'whatsapp',
          payload: {
            entry: [{
              changes: [{
                value: {
                  messages: [{
                    id: data.id,
                    from: contactPhone,
                    text: { body: inputText },
                    timestamp: Math.floor(Date.now() / 1000).toString()
                  }],
                  contacts: [{
                    profile: { name: contact?.name || 'Unknown' }
                  }]
                }
              }]
            }]
          }
        }
      });

      setInputText('');
      setReplyingTo(null);
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      // Remove failed message
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp_')));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTyping = () => {
    // Send typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Broadcast typing status
    supabase.channel(`typing:${contactPhone}`)
      .track({
        phone: contactPhone,
        is_typing: true,
        timestamp: Date.now()
      });

    typingTimeoutRef.current = setTimeout(() => {
      supabase.channel(`typing:${contactPhone}`)
        .track({
          phone: contactPhone,
          is_typing: false,
          timestamp: Date.now()
        });
    }, 3000);
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleFileUpload = async (file: File, type: string) => {
    // Implementation for file upload
    setShowFileUploader(false);
    toast({
      title: "File Upload",
      description: "File upload feature will be implemented"
    });
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      // Update message with reaction - would need to add reactions column
      console.log('Adding reaction:', { messageId, emoji });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Never';
    return `Last seen ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}`;
  };

  const filteredMessages = searchQuery 
    ? messages.filter(m => 
        m.message_text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  if (isLoading) {
    return (
      <Card className={cn("h-[600px] flex items-center justify-center", className)}>
        <div className="animate-pulse">Loading conversation...</div>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "flex flex-col",
      isFullScreen ? "h-screen w-full" : "h-[600px] w-full max-w-md",
      className
    )}>
      {/* Header */}
      <CardHeader className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center gap-3">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          <Avatar className="h-10 w-10">
            <AvatarImage src={contact?.avatar_url} />
            <AvatarFallback>
              {contact?.name?.[0] || contact?.phone_number?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">
              {contact?.name || contact?.phone_number}
            </h3>
            <p className="text-xs text-muted-foreground">
              {contact?.is_online ? (
                <span className="text-green-500">Online</span>
              ) : (
                formatLastSeen(contact?.last_seen)
              )}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-4">
          <div className="py-4 space-y-4">
            {filteredMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isSelected={selectedMessage === message.id}
                onSelect={() => setSelectedMessage(
                  selectedMessage === message.id ? null : message.id
                )}
                onReply={() => setReplyingTo(message)}
                onReaction={(emoji) => handleReaction(message.id, emoji)}
              />
            ))}
            
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      {/* Reply Banner */}
      {replyingTo && (
        <div className="border-t px-4 py-2 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">Replying to</span>
              <p className="truncate max-w-[200px]">{replyingTo.message_text}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setReplyingTo(null)}
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4 space-y-3">
        <div className="flex items-end gap-2">
          {/* File attachment */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => setShowFileUploader(true)}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Text input */}
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="pr-10 resize-none min-h-[40px]"
              disabled={isSending}
            />
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-8 w-8"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>

          {/* Send/Record button */}
          {inputText.trim() ? (
            <Button
              onClick={sendMessage}
              disabled={isSending}
              className="h-10 w-10 rounded-full p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onMouseDown={() => setIsRecording(true)}
              onMouseUp={() => setIsRecording(false)}
              onMouseLeave={() => setIsRecording(false)}
            >
              <Mic className={cn(
                "h-4 w-4",
                isRecording && "text-red-500"
              )} />
            </Button>
          )}
        </div>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}

        {/* File Uploader */}
        {showFileUploader && (
          <FileUploader
            onFileUpload={handleFileUpload}
            onClose={() => setShowFileUploader(false)}
          />
        )}
      </div>
    </Card>
  );
}